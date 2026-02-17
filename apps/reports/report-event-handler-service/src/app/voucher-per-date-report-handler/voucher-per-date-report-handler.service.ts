import { VoucherDatabaseService } from '@accounting-database-service';
import { FileDetailsDto, ReportDto, ReportEventDto, ReportFileDetailDto, ReportStatusEnum, VoucherDto } from '@dto';
import { ExcelGeneratorService } from '@excel-generator-service';
import { Injectable, Logger } from '@nestjs/common';
import { ReportDatabaseService } from '@report-database-service';

type VoucherReportRow = Record<string, string | number>;

@Injectable()
export class VoucherPerDateReportHandlerService {
    private readonly logger = new Logger(VoucherPerDateReportHandlerService.name);

    constructor(
        private readonly voucherDatabaseService: VoucherDatabaseService,
        private readonly reportDatabaseService: ReportDatabaseService,
        private readonly excelGeneratorService: ExcelGeneratorService
    ) {}

    async handleVoucherReport(event: ReportEventDto): Promise<void> {
        this.logger.log(`Processing VOUCHER report: reportId=${event.reportId}`);

        const startDate = event.filters?.startDate;
        const endDate = event.filters?.endDate;

        if (!startDate || !endDate) {
            await this.updateReportStatus(
                event,
                ReportStatusEnum.FAILED,
                undefined,
                undefined,
                'Start date and end date are required'
            );
            return;
        }

        try {
            // Fetch all ACTIVE vouchers in the date range (non-paginated)
            let voucherRecords = await this.voucherDatabaseService.getVouchersByDateRange(startDate, endDate);

            // Apply optional client-side filters
            voucherRecords = this.applyOptionalFilters(voucherRecords, event);

            if (voucherRecords.length === 0) {
                await this.updateReportStatus(
                    event,
                    ReportStatusEnum.FAILED,
                    undefined,
                    undefined,
                    'No voucher records found matching the selected filters'
                );
                return;
            }

            // Sort by voucherDate ascending, then voucherNo
            voucherRecords = this.sortVouchers(voucherRecords);

            // Determine if sub-row columns are needed
            const includeDetailColumns = voucherRecords.some((v) => v.voucherDetails && v.voucherDetails.length > 0);

            // Build report DTO
            const reportDto = this.buildReportDto(event, voucherRecords, includeDetailColumns);

            // Generate Excel
            const fileDetails = await this.excelGeneratorService.generateExcelReport(reportDto);

            // Update status
            await this.updateReportStatus(event, ReportStatusEnum.READY, reportDto.reportFilename, fileDetails);

            this.logger.log(
                `✅ VOUCHER report generated: reportId=${event.reportId}, records=${voucherRecords.length}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            this.logger.error(`❌ VOUCHER report failed: reportId=${event.reportId}`, error);
            await this.updateReportStatus(event, ReportStatusEnum.FAILED, undefined, undefined, errorMessage);
            throw error;
        }
    }

    // ─── Filtering ───────────────────────────────────────────────────────

    private applyOptionalFilters(records: VoucherDto[], event: ReportEventDto): VoucherDto[] {
        const filters = event.filters || {};

        // Customer filter (multi)
        const customerIds = (filters.customerIds || []).filter(Boolean);
        const customerIdSet = customerIds.length > 0 ? new Set(customerIds) : undefined;

        // Area filter (multi)
        const areaIds = (filters.areaIds || []).filter(Boolean);
        const areaIdSet = areaIds.length > 0 ? new Set(areaIds) : undefined;

        // Account Type filter
        const accountType = filters.accountType || '';

        // Sub Account filter (multi) — keep vouchers that have at least one matching detail
        const subAccounts = (filters.subAccounts || []).filter(Boolean);
        const subAccountSet = subAccounts.length > 0 ? new Set(subAccounts) : undefined;

        return records.filter((voucher) => {
            if (customerIdSet && !customerIdSet.has(voucher.customerId || '')) return false;
            if (areaIdSet && !areaIdSet.has(voucher.areaId || '')) return false;
            if (accountType && voucher.accountType !== accountType) return false;
            if (subAccountSet) {
                const details = voucher.voucherDetails || [];
                const hasMatch = details.some((d) => subAccountSet.has(d.subAccount || ''));
                if (!hasMatch) return false;
            }
            return true;
        });
    }

    // ─── Sorting ─────────────────────────────────────────────────────────

    private sortVouchers(records: VoucherDto[]): VoucherDto[] {
        return [...records].sort((a, b) => {
            const dateCompare = (a.voucherDate || '').localeCompare(b.voucherDate || '');
            if (dateCompare !== 0) return dateCompare;
            return (a.voucherNo || '').localeCompare(b.voucherNo || '');
        });
    }

    // ─── Report Building ─────────────────────────────────────────────────

    private getReportHeaders(includeDetailColumns: boolean) {
        const base = [
            { description: 'Voucher No', metaData: {} },
            { description: 'Voucher Date', metaData: {} },
            { description: 'Account Name', metaData: {} },
            { description: 'Account Type', metaData: {} },
            { description: 'Customer Name', metaData: {} },
            { description: 'Area Name', metaData: {} },
            { description: 'Payment Type', metaData: {} },
            { description: 'Total Amount', metaData: {} },
            { description: 'Remarks', metaData: {} },
        ];

        if (includeDetailColumns) {
            base.push({ description: 'Sub Account', metaData: {} }, { description: 'Amount', metaData: {} });
        }

        return base;
    }

    private buildVoucherRow(voucher: VoucherDto, includeDetailColumns: boolean): VoucherReportRow {
        const row: VoucherReportRow = {
            'Voucher No': voucher.voucherNo || '',
            'Voucher Date': voucher.voucherDate || '',
            'Account Name': voucher.accountName || '',
            'Account Type': voucher.accountType || '',
            'Customer Name': voucher.customerName || '',
            'Area Name': voucher.areaName || '',
            'Payment Type': voucher.paymentType || '',
            'Total Amount': voucher.totalAmount ?? 0,
            Remarks: voucher.remarks || '',
        };

        if (includeDetailColumns) {
            row['Sub Account'] = '';
            row['Amount'] = '';
        }

        return row;
    }

    private buildDetailSubRow(
        detail: { subAccount?: string; amount?: number },
        includeDetailColumns: boolean
    ): VoucherReportRow {
        const row: VoucherReportRow = {
            'Voucher No': '',
            'Voucher Date': '',
            'Account Name': '',
            'Account Type': '',
            'Customer Name': '',
            'Area Name': '',
            'Payment Type': '',
            'Total Amount': '',
            Remarks: '',
        };

        if (includeDetailColumns) {
            row['Sub Account'] = detail.subAccount || '';
            row['Amount'] = detail.amount ?? 0;
        }

        return row;
    }

    private buildRows(records: VoucherDto[], includeDetailColumns: boolean): VoucherReportRow[] {
        const rows: VoucherReportRow[] = [];

        for (const voucher of records) {
            rows.push(this.buildVoucherRow(voucher, includeDetailColumns));

            // Add voucher detail sub-rows
            if (includeDetailColumns) {
                const details = voucher.voucherDetails || [];
                for (const detail of details) {
                    rows.push(this.buildDetailSubRow(detail, includeDetailColumns));
                }
            }
        }

        return rows;
    }

    private buildReportDto(event: ReportEventDto, records: VoucherDto[], includeDetailColumns: boolean): ReportDto {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Voucher Report';
        reportDto.reportFilename = `${event.reportName || 'Voucher-Report'}.xlsx`;
        reportDto.headers = this.getReportHeaders(includeDetailColumns);
        reportDto.rows = this.buildRows(records, includeDetailColumns);
        return reportDto;
    }

    // ─── Report Status Update ────────────────────────────────────────────

    private async updateReportStatus(
        event: ReportEventDto,
        status: ReportStatusEnum,
        reportFilename?: string,
        fileDetails?: FileDetailsDto,
        errorMessage?: string
    ): Promise<void> {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.status = status;
        reportDto.reportFilename = reportFilename;
        reportDto.errorMessage = errorMessage;

        if (fileDetails) {
            const reportFileDetail = new ReportFileDetailDto();
            reportFileDetail.filename = fileDetails.fileName;
            reportFileDetail.bucket = fileDetails.s3Bucket;
            reportFileDetail.key = fileDetails.s3Key;
            reportFileDetail.fileType = fileDetails.fileType;
            reportDto.fileDetails = reportFileDetail;
        }

        await this.reportDatabaseService.updateRecordStatus(reportDto);
    }
}
