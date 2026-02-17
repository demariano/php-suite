import { AreaDatabaseService } from '@customer-database-service';
import {
    ContractDto,
    FileDetailsDto,
    PaymentDetailsDto,
    PaymentDto,
    PaymentInvoiceDetailsDto,
    ReportDto,
    ReportEventDto,
    ReportFileDetailDto,
    ReportStatusEnum,
} from '@dto';
import { ExcelGeneratorService } from '@excel-generator-service';
import {
    ContractDatabaseService,
    PaymentDatabaseService,
    PaymentInvoiceDatabaseService,
} from '@invoicing-database-service';
import { Injectable, Logger } from '@nestjs/common';
import { ReportDatabaseService } from '@report-database-service';

type PaymentsReceivedRow = Record<string, string | number>;

@Injectable()
export class PaymentsReceivedReportHandlerService {
    private readonly logger = new Logger(PaymentsReceivedReportHandlerService.name);

    constructor(
        private readonly paymentDatabaseService: PaymentDatabaseService,
        private readonly paymentInvoiceDatabaseService: PaymentInvoiceDatabaseService,
        private readonly contractDatabaseService: ContractDatabaseService,
        private readonly areaDatabaseService: AreaDatabaseService,
        private readonly reportDatabaseService: ReportDatabaseService,
        private readonly excelGeneratorService: ExcelGeneratorService
    ) {}

    async handlePaymentsReceivedReport(event: ReportEventDto): Promise<void> {
        this.logger.log(`Processing PAYMENTS_RECEIVED report: reportId=${event.reportId}`);

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
            // 1. Fetch all payments in date range (all statuses)
            let payments = await this.paymentDatabaseService.getPaymentsByDateRangeAllStatuses(startDate, endDate);

            // 2. Apply in-memory filters (except invoiceDocNos which needs PaymentInvoice lookup)
            payments = this.applyBasicFilters(payments, event);

            if (payments.length === 0 && !this.hasInvoiceDocNoFilter(event)) {
                await this.updateReportStatus(
                    event,
                    ReportStatusEnum.FAILED,
                    undefined,
                    undefined,
                    'No payments found matching the selected filters'
                );
                return;
            }

            // 3. Build lookup maps for reference fields
            const [contractMap, areaMap] = await Promise.all([
                this.buildContractLookupMap(),
                this.buildAreaLookupMap(),
            ]);

            // 4. Update reference field names from lookup maps
            payments = payments.map((payment) => {
                const updated = { ...payment };

                if (updated.contractId && contractMap.has(updated.contractId)) {
                    updated.contractName = contractMap.get(updated.contractId) || updated.contractName;
                }
                if (updated.areaId && areaMap.has(updated.areaId)) {
                    updated.areaName = areaMap.get(updated.areaId) || updated.areaName;
                }

                return updated;
            });

            // 5. Fetch PaymentInvoice details for each payment and build the doc no column
            const paymentInvoiceMap = await this.buildPaymentInvoiceMap(payments);

            // 6. Apply invoiceDocNos filter if present
            if (this.hasInvoiceDocNoFilter(event)) {
                const invoiceDocNos = (event.filters?.invoiceDocNos || [])
                    .map((d) => d.trim().toUpperCase())
                    .filter(Boolean);
                const docNoSet = new Set(invoiceDocNos);

                payments = payments.filter((payment) => {
                    const invoiceDetails = paymentInvoiceMap.get(payment.paymentId) || [];
                    return invoiceDetails.some((detail) => docNoSet.has((detail.docno || '').toUpperCase()));
                });
            }

            if (payments.length === 0) {
                await this.updateReportStatus(
                    event,
                    ReportStatusEnum.FAILED,
                    undefined,
                    undefined,
                    'No payments found matching the selected filters'
                );
                return;
            }

            // 7. Sort by payment date
            payments = this.sortPaymentsByDate(payments);

            // 8. Read detail flags
            const includePaymentDetails = !!event.filters?.includePaymentDetails;
            const includePaymentInvoiceDetails = !!event.filters?.includePaymentInvoiceDetails;
            const detailOpts = { includePaymentDetails, includePaymentInvoiceDetails };

            // 9. Build report
            const separateByArea = !!event.filters?.separateByArea;
            const reportDto = separateByArea
                ? this.buildAreaWorkbookReportDto(event, payments, paymentInvoiceMap, detailOpts)
                : this.buildReportDto(event, payments, paymentInvoiceMap, detailOpts);

            // 10. Generate Excel
            const fileDetails = await this.excelGeneratorService.generateExcelReport(reportDto);

            // 11. Update report status
            await this.updateReportStatus(event, ReportStatusEnum.READY, reportDto.reportFilename, fileDetails);

            this.logger.log(
                `✅ PAYMENTS_RECEIVED report generated: reportId=${event.reportId}, records=${payments.length}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            this.logger.error(`❌ PAYMENTS_RECEIVED report failed: reportId=${event.reportId}`, error);
            await this.updateReportStatus(event, ReportStatusEnum.FAILED, undefined, undefined, errorMessage);
            throw error;
        }
    }

    // ─── Filtering ───────────────────────────────────────────────────────

    private hasInvoiceDocNoFilter(event: ReportEventDto): boolean {
        const invoiceDocNos = event.filters?.invoiceDocNos;
        return !!invoiceDocNos && invoiceDocNos.length > 0 && invoiceDocNos.some((d) => d.trim() !== '');
    }

    private applyBasicFilters(payments: PaymentDto[], event: ReportEventDto): PaymentDto[] {
        const filters = event.filters || {};

        // Customer filter
        const customerIds = (filters.customerIds || []).filter(Boolean);
        const customerIdSet = customerIds.length > 0 ? new Set(customerIds) : undefined;

        // Area filter
        const areaIds = (filters.areaIds || []).filter(Boolean);
        const areaIdSet = areaIds.length > 0 ? new Set(areaIds) : undefined;

        // Contract filter
        const contractIds = (filters.contractIds || []).filter(Boolean);
        const contractIdSet = contractIds.length > 0 ? new Set(contractIds.map((c) => c.trim())) : undefined;

        // Payment record status filter
        const paymentRecordStatuses = (filters.paymentRecordStatuses || []).filter(Boolean);
        const statusSet = paymentRecordStatuses.length > 0 ? new Set(paymentRecordStatuses) : undefined;

        // Receipt nos filter
        const receiptNos = (filters.receiptNos || []).map((r) => r.trim().toUpperCase()).filter(Boolean);
        const receiptNoSet = receiptNos.length > 0 ? new Set(receiptNos) : undefined;

        // Boolean filters
        const contractPaymentFilter = filters.contractPayment;
        const customerCreditFilter = filters.customerCreditPayment;

        return payments.filter((payment) => {
            // Customer filter
            if (customerIdSet && !customerIdSet.has(payment.customerId || '')) return false;

            // Area filter
            if (areaIdSet && !areaIdSet.has(payment.areaId || '')) return false;

            // Contract filter
            if (contractIdSet) {
                const paymentContractId = typeof payment.contractId === 'string' ? payment.contractId.trim() : '';
                if (!contractIdSet.has(paymentContractId)) return false;
            }

            // Payment status filter
            if (statusSet && !statusSet.has(payment.status || '')) return false;

            // Receipt no filter
            if (receiptNoSet && !receiptNoSet.has((payment.receiptNo || '').toUpperCase())) return false;

            // Contract payment filter
            if (contractPaymentFilter !== undefined && contractPaymentFilter !== null) {
                if (payment.contractPayment !== contractPaymentFilter) return false;
            }

            // Customer credit payment filter
            if (customerCreditFilter !== undefined && customerCreditFilter !== null) {
                if (payment.customerCreditPayment !== customerCreditFilter) return false;
            }

            return true;
        });
    }

    // ─── Sorting ─────────────────────────────────────────────────────────

    private sortPaymentsByDate(payments: PaymentDto[]): PaymentDto[] {
        return [...payments].sort((a, b) => {
            const aTime = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
            const bTime = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
            return aTime - bTime;
        });
    }

    // ─── PaymentInvoice Lookup ───────────────────────────────────────────

    private async buildPaymentInvoiceMap(payments: PaymentDto[]): Promise<Map<string, PaymentInvoiceDetailsDto[]>> {
        const map = new Map<string, PaymentInvoiceDetailsDto[]>();

        // Batch fetch in chunks of 25 to avoid overwhelming DynamoDB
        const BATCH_SIZE = 25;
        for (let i = 0; i < payments.length; i += BATCH_SIZE) {
            const batch = payments.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(
                batch.map(async (payment) => {
                    try {
                        const invoiceDetails = await this.paymentInvoiceDatabaseService.findRecordByPaymentId(
                            payment.paymentId
                        );
                        return { paymentId: payment.paymentId, invoiceDetails };
                    } catch {
                        this.logger.warn(`Failed to fetch invoice details for payment ${payment.paymentId}`);
                        return { paymentId: payment.paymentId, invoiceDetails: [] as PaymentInvoiceDetailsDto[] };
                    }
                })
            );

            for (const result of results) {
                map.set(result.paymentId, result.invoiceDetails);
            }
        }

        return map;
    }

    // ─── Lookup Maps ─────────────────────────────────────────────────────

    private async buildContractLookupMap(): Promise<Map<string, string>> {
        const map = new Map<string, string>();
        let cursorPointer: string | undefined = undefined;
        let direction = '';
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const page = await this.contractDatabaseService.findRecordsByPagination(
                limit,
                direction,
                cursorPointer || ''
            );
            page.data.forEach((contract: ContractDto) => {
                if (contract.contractId && contract.contractName) {
                    map.set(contract.contractId, contract.contractName);
                }
            });
            cursorPointer = page.nextCursorPointer ? JSON.stringify(page.nextCursorPointer) : undefined;
            direction = 'next';
            hasMore = !!page.nextCursorPointer;
        }

        return map;
    }

    private async buildAreaLookupMap(): Promise<Map<string, string>> {
        const map = new Map<string, string>();
        let cursorPointer: string | undefined = undefined;
        let direction = '';
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const page = await this.areaDatabaseService.findRecordsByPagination(limit, direction, cursorPointer || '');
            page.data.forEach((area: { areaId?: string; areaName?: string }) => {
                if (area.areaId && area.areaName) {
                    map.set(area.areaId, area.areaName);
                }
            });
            cursorPointer = page.nextCursorPointer ? JSON.stringify(page.nextCursorPointer) : undefined;
            direction = 'next';
            hasMore = !!page.nextCursorPointer;
        }

        return map;
    }

    // ─── Report Building ─────────────────────────────────────────────────

    private getReportHeaders() {
        return [
            { description: 'Receipt No', metaData: {} },
            { description: 'Payment Date', metaData: {} },
            { description: 'Customer', metaData: {} },
            { description: 'Area', metaData: {} },
            { description: 'Contract No', metaData: {} },
            { description: 'Contract Name', metaData: {} },
            { description: 'Payment Amount', metaData: {} },
            { description: 'Status', metaData: {} },
            { description: 'Contract Payment', metaData: {} },
            { description: 'Customer Credit', metaData: {} },
            { description: 'Cheque Clear Status', metaData: {} },
            { description: 'Payment Details', metaData: {} },
            { description: 'Applied Invoice Doc Nos', metaData: {} },
        ];
    }

    private buildPaymentRow(
        payment: PaymentDto,
        paymentInvoiceMap: Map<string, PaymentInvoiceDetailsDto[]>,
        opts?: { includePaymentDetails?: boolean; includePaymentInvoiceDetails?: boolean }
    ): Record<string, unknown> {
        // Build payment details summary (flattened) – blank when sub-rows will show them
        const paymentDetailsSummary = opts?.includePaymentDetails ? '' : this.formatPaymentDetails(payment);

        // Build applied invoice doc nos (flattened) – blank when sub-rows will show them
        const invoiceDetails = paymentInvoiceMap.get(payment.paymentId) || [];
        const appliedDocNos = opts?.includePaymentInvoiceDetails
            ? ''
            : invoiceDetails
                  .map((detail) => detail.docno)
                  .filter(Boolean)
                  .join(', ');

        return {
            'Receipt No': payment.receiptNo || '',
            'Payment Date': payment.paymentDate || '',
            Customer: payment.customerName || payment.customerId || '',
            Area: payment.areaName || 'Unassigned',
            'Contract No': payment.contractNo || '',
            'Contract Name': payment.contractName || '',
            'Payment Amount': Number(payment.paymentAmount ?? 0),
            Status: payment.status || '',
            'Contract Payment': payment.contractPayment ? 'Yes' : 'No',
            'Customer Credit': payment.customerCreditPayment ? 'Yes' : 'No',
            'Cheque Clear Status': payment.chequeClearStatus || '',
            'Payment Details': paymentDetailsSummary,
            'Applied Invoice Doc Nos': appliedDocNos,
        };
    }

    // ─── Sub-Header / Sub-Row Builders ───────────────────────────────────

    private buildPaymentDetailSubHeaderRow(): PaymentsReceivedRow {
        return {
            __subHeader: true,
            'Receipt No': 'Payment Type',
            'Payment Date': 'Amount',
            Customer: 'Cheque No',
            Area: 'Bank Name',
            'Contract No': 'Bank Account No',
        } as unknown as PaymentsReceivedRow;
    }

    private buildPaymentDetailSubRow(detail: PaymentDetailsDto): PaymentsReceivedRow {
        return {
            'Receipt No': detail.paymentType || '',
            'Payment Date': Number(detail.amount ?? 0),
            Customer: detail.chequeNo || '',
            Area: detail.bankName || '',
            'Contract No': detail.bankAccountNo || '',
        } as unknown as PaymentsReceivedRow;
    }

    private buildPaymentInvoiceSubHeaderRow(): PaymentsReceivedRow {
        return {
            __subHeader: true,
            'Receipt No': 'Invoice Doc No',
            'Payment Date': 'Amount Applied',
        } as unknown as PaymentsReceivedRow;
    }

    private buildPaymentInvoiceSubRow(invoice: PaymentInvoiceDetailsDto): PaymentsReceivedRow {
        return {
            'Receipt No': invoice.docno || '',
            'Payment Date': Number(invoice.amountApplied ?? 0),
        } as unknown as PaymentsReceivedRow;
    }

    private buildRows(
        payments: PaymentDto[],
        paymentInvoiceMap: Map<string, PaymentInvoiceDetailsDto[]>,
        opts: { includePaymentDetails?: boolean; includePaymentInvoiceDetails?: boolean }
    ): Record<string, unknown>[] {
        const rows: Record<string, unknown>[] = [];

        for (const payment of payments) {
            rows.push(this.buildPaymentRow(payment, paymentInvoiceMap, opts));

            if (opts.includePaymentDetails && payment.paymentDetails?.length) {
                rows.push(this.buildPaymentDetailSubHeaderRow());
                for (const detail of payment.paymentDetails) {
                    rows.push(this.buildPaymentDetailSubRow(detail));
                }
            }

            if (opts.includePaymentInvoiceDetails) {
                const invoices = paymentInvoiceMap.get(payment.paymentId) || [];
                if (invoices.length) {
                    rows.push(this.buildPaymentInvoiceSubHeaderRow());
                    for (const inv of invoices) {
                        rows.push(this.buildPaymentInvoiceSubRow(inv));
                    }
                }
            }
        }

        return rows;
    }

    private formatPaymentDetails(payment: PaymentDto): string {
        if (!payment.paymentDetails || payment.paymentDetails.length === 0) {
            return '';
        }

        return payment.paymentDetails
            .map((detail) => {
                const type = detail.paymentType || 'Unknown';
                const amount = Number(detail.amount ?? 0);
                const parts: string[] = [`${type}: ₱${amount.toFixed(2)}`];

                if (detail.chequeNo) {
                    parts.push(`Chk#${detail.chequeNo}`);
                }
                if (detail.bankName) {
                    parts.push(`Bank: ${detail.bankName}`);
                }

                return parts.join(' | ');
            })
            .join('; ');
    }

    private buildReportDto(
        event: ReportEventDto,
        payments: PaymentDto[],
        paymentInvoiceMap: Map<string, PaymentInvoiceDetailsDto[]>,
        opts: { includePaymentDetails?: boolean; includePaymentInvoiceDetails?: boolean } = {}
    ): ReportDto {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Payments Received';
        reportDto.reportFilename = `${event.reportName || 'Payments-Received'}.xlsx`;

        reportDto.headers = this.getReportHeaders();
        reportDto.rows = this.buildRows(payments, paymentInvoiceMap, opts);

        return reportDto;
    }

    private buildAreaWorkbookReportDto(
        event: ReportEventDto,
        payments: PaymentDto[],
        paymentInvoiceMap: Map<string, PaymentInvoiceDetailsDto[]>,
        opts: { includePaymentDetails?: boolean; includePaymentInvoiceDetails?: boolean } = {}
    ): ReportDto {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Payments Received';
        reportDto.reportFilename = `${event.reportName || 'Payments-Received'}.xlsx`;

        const headers = this.getReportHeaders();

        // Group payments by area
        const grouped = new Map<string, PaymentDto[]>();
        for (const payment of payments) {
            const key = payment.areaId || 'UNASSIGNED';
            const list = grouped.get(key) || [];
            list.push(payment);
            grouped.set(key, list);
        }

        const used = new Set<string>();
        const sheets = Array.from(grouped.values()).map((areaPayments) => {
            const sorted = this.sortPaymentsByDate(areaPayments);
            const sample = sorted[0];
            const baseName = sample?.areaName || 'Unassigned';
            const name = this.uniqueSheetName(baseName, used);
            return {
                name,
                headers,
                rows: this.buildRows(sorted, paymentInvoiceMap, opts),
            };
        });

        reportDto.workbook = { sheets };
        return reportDto;
    }

    // ─── Sheet Name Helpers ──────────────────────────────────────────────

    private normalizeSheetName(name: string): string {
        const cleaned = name.replace(/[:\\/?*\u005B\u005D]/g, ' ').trim();
        const truncated = cleaned.length > 31 ? cleaned.slice(0, 31).trim() : cleaned;
        return truncated || 'Sheet';
    }

    private uniqueSheetName(baseName: string, used: Set<string>): string {
        const base = this.normalizeSheetName(baseName);
        let name = base;
        let i = 2;
        while (used.has(name)) {
            const suffix = ` (${i})`;
            const maxBase = 31 - suffix.length;
            name = `${base.slice(0, Math.max(1, maxBase)).trim()}${suffix}`;
            i += 1;
        }
        used.add(name);
        return name;
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
