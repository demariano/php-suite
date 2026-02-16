import { AreaDatabaseService } from '@customer-database-service';
import {
    ContractDto,
    FileDetailsDto,
    InvoiceDto,
    ReportDto,
    ReportEventDto,
    ReportFileDetailDto,
    ReportStatusEnum,
    SalesTypeDto,
    TerritoryManagerDto,
} from '@dto';
import { ExcelGeneratorService } from '@excel-generator-service';
import {
    ContractDatabaseService,
    InvoiceDatabaseService,
    SalesTypeDatabaseService,
    TerritoryManagerDatabaseService,
} from '@invoicing-database-service';
import { Injectable, Logger } from '@nestjs/common';
import { ReportDatabaseService } from '@report-database-service';

@Injectable()
export class InvoicePerDateReportHandlerService {
    private readonly logger = new Logger(InvoicePerDateReportHandlerService.name);

    constructor(
        private readonly invoiceDatabaseService: InvoiceDatabaseService,
        private readonly salesTypeDatabaseService: SalesTypeDatabaseService,
        private readonly contractDatabaseService: ContractDatabaseService,
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseService,
        private readonly areaDatabaseService: AreaDatabaseService,
        private readonly reportDatabaseService: ReportDatabaseService,
        private readonly excelGeneratorService: ExcelGeneratorService
    ) {}

    async handleInvoicePerDateReport(event: ReportEventDto): Promise<void> {
        this.logger.log(`Processing INVOICE_PER_DATE report: reportId=${event.reportId}`);

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
            const fields = [
                'invoiceId',
                'docno',
                'invoiceDate',
                'customerId',
                'customerName',
                'areaId',
                'areaName',
                'territoryManagerId',
                'territoryManagerName',
                'salesTypeId',
                'salesTypeName',
                'contractId',
                'contractName',
                'invoiceAmount',
                'taxAmount',
                'finalAmount',
                'paymentStatus',
                'status',
            ];

            let invoices = await this.fetchInvoices(event, startDate, endDate, fields);
            invoices = this.applyOptionalFilters(invoices, event);

            if (invoices.length === 0) {
                await this.updateReportStatus(
                    event,
                    ReportStatusEnum.FAILED,
                    undefined,
                    undefined,
                    'No invoices found matching the selected filters'
                );
                return;
            }

            const salesTypeMap = await this.buildSalesTypeLookupMap();
            const contractMap = await this.buildContractLookupMap();
            const territoryManagerMap = await this.buildTerritoryManagerLookupMap();
            const areaMap = await this.buildAreaLookupMap();

            invoices = invoices.map((invoice) => {
                const updated = { ...invoice };

                if (updated.salesTypeId && salesTypeMap.has(updated.salesTypeId)) {
                    updated.salesTypeName = salesTypeMap.get(updated.salesTypeId);
                }
                if (updated.contractId && contractMap.has(updated.contractId)) {
                    updated.contractName = contractMap.get(updated.contractId);
                }
                if (updated.territoryManagerId && territoryManagerMap.has(updated.territoryManagerId)) {
                    updated.territoryManagerName = territoryManagerMap.get(updated.territoryManagerId);
                }
                if (updated.areaId && areaMap.has(updated.areaId)) {
                    updated.areaName = areaMap.get(updated.areaId);
                }

                return updated;
            });

            invoices = this.sortInvoicesByDate(invoices);

            const separateByArea = !!event.filters?.separateByArea;
            const reportDto = separateByArea
                ? this.buildAreaWorkbookReportDto(event, invoices)
                : this.buildReportDto(event, invoices);
            const fileDetails = await this.excelGeneratorService.generateExcelReport(reportDto);

            await this.updateReportStatus(event, ReportStatusEnum.READY, reportDto.reportFilename, fileDetails);

            this.logger.log(
                `✅ INVOICE_PER_DATE report generated: reportId=${event.reportId}, records=${invoices.length}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            this.logger.error(`❌ INVOICE_PER_DATE report failed: reportId=${event.reportId}`, error);
            await this.updateReportStatus(event, ReportStatusEnum.FAILED, undefined, undefined, errorMessage);
            throw error;
        }
    }

    private async fetchInvoices(
        event: ReportEventDto,
        startDate: string,
        endDate: string,
        fields: string[]
    ): Promise<InvoiceDto[]> {
        const customerIds = (event.filters?.customerIds || []).filter(Boolean);
        const customerId = event.filters?.customerId;
        const effectiveCustomerIds = customerIds.length > 0 ? customerIds : customerId ? [customerId] : [];
        const areaId = event.filters?.areaId;
        const salesTypeIds = (event.filters?.salesTypeIds || []).filter(Boolean);
        const salesTypeId = event.filters?.salesTypeId;
        const effectiveSalesTypeIds = salesTypeIds.length > 0 ? salesTypeIds : salesTypeId ? [salesTypeId] : [];

        if (effectiveCustomerIds.length === 1) {
            return await this.invoiceDatabaseService.getInvoicesByCustomerAndDateRange(
                effectiveCustomerIds[0],
                startDate,
                endDate,
                fields
            );
        }

        if (areaId) {
            return await this.invoiceDatabaseService.getInvoicesByAreaAndDateRange(areaId, startDate, endDate, fields);
        }

        if (effectiveSalesTypeIds.length === 1) {
            return await this.invoiceDatabaseService.getInvoicesBySalesTypeAndDateRange(
                effectiveSalesTypeIds[0],
                startDate,
                endDate,
                fields
            );
        }

        return await this.invoiceDatabaseService.getInvoicesByDateRange(startDate, endDate, fields);
    }

    private applyOptionalFilters(invoices: InvoiceDto[], event: ReportEventDto): InvoiceDto[] {
        const customerIds = (event.filters?.customerIds || []).filter(Boolean);
        const customerId = event.filters?.customerId;
        const effectiveCustomerIds = customerIds.length > 0 ? customerIds : customerId ? [customerId] : [];
        const areaId = event.filters?.areaId;
        const areaIds = event.filters?.areaIds;
        const salesTypeIds = (event.filters?.salesTypeIds || []).filter(Boolean);
        const salesTypeId = event.filters?.salesTypeId;
        const effectiveSalesTypeIds = salesTypeIds.length > 0 ? salesTypeIds : salesTypeId ? [salesTypeId] : [];
        const contractIds = (event.filters?.contractIds || []).filter(Boolean);
        const contractId = event.filters?.contractId;
        const effectiveContractIds = contractIds.length > 0 ? contractIds : contractId ? [contractId] : [];

        const areaIdSet = areaIds && areaIds.length > 0 ? new Set(areaIds) : undefined;
        const customerIdSet = effectiveCustomerIds.length > 0 ? new Set(effectiveCustomerIds) : undefined;
        const salesTypeIdSet = effectiveSalesTypeIds.length > 0 ? new Set(effectiveSalesTypeIds) : undefined;
        const contractIdSet =
            effectiveContractIds.length > 0 ? new Set(effectiveContractIds.map((x) => x.trim())) : undefined;

        return invoices.filter((inv) => {
            if (customerIdSet && !customerIdSet.has(inv.customerId || '')) return false;
            if (areaId && inv.areaId !== areaId) return false;
            if (areaIdSet && !areaIdSet.has(inv.areaId || '')) return false;
            if (salesTypeIdSet && !salesTypeIdSet.has(inv.salesTypeId || '')) return false;
            if (contractIdSet) {
                const invContractId = typeof inv.contractId === 'string' ? inv.contractId.trim() : '';
                if (!contractIdSet.has(invContractId)) return false;
            }
            return true;
        });
    }

    private sortInvoicesByDate(invoices: InvoiceDto[]): InvoiceDto[] {
        return [...invoices].sort((a, b) => {
            const aTime = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0;
            const bTime = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0;
            return aTime - bTime;
        });
    }

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

    private async buildSalesTypeLookupMap(): Promise<Map<string, string>> {
        const map = new Map<string, string>();
        let cursorPointer: string | undefined = undefined;
        let direction = '';
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const page = await this.salesTypeDatabaseService.findRecordsByPagination(
                limit,
                direction,
                cursorPointer || ''
            );
            page.data.forEach((salesType: SalesTypeDto) => {
                if (salesType.salesTypeId && salesType.salesTypeName) {
                    map.set(salesType.salesTypeId, salesType.salesTypeName);
                }
            });
            cursorPointer = page.nextCursorPointer ? JSON.stringify(page.nextCursorPointer) : undefined;
            direction = 'next';
            hasMore = !!page.nextCursorPointer;
        }

        return map;
    }

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

    private async buildTerritoryManagerLookupMap(): Promise<Map<string, string>> {
        const map = new Map<string, string>();
        let cursorPointer: string | undefined = undefined;
        let direction = '';
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const page = await this.territoryManagerDatabaseService.findRecordsByPagination(
                limit,
                direction,
                cursorPointer || ''
            );
            page.data.forEach((tm: TerritoryManagerDto) => {
                if (tm.territoryManagerId && tm.territoryManagerName) {
                    map.set(tm.territoryManagerId, tm.territoryManagerName);
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

    private buildReportDto(event: ReportEventDto, invoices: InvoiceDto[]): ReportDto {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Invoice Per Date';
        reportDto.reportFilename = `${event.reportName || 'Invoice-Per-Date'}.xlsx`;

        reportDto.headers = [
            { description: 'Doc No', metaData: {} },
            { description: 'Invoice Date', metaData: {} },
            { description: 'Customer', metaData: {} },
            { description: 'Area', metaData: {} },
            { description: 'Territory Manager', metaData: {} },
            { description: 'Sales Type', metaData: {} },
            { description: 'Contract', metaData: {} },
            { description: 'Invoice Amount', metaData: {} },
            { description: 'Tax Amount', metaData: {} },
            { description: 'Final Amount', metaData: {} },
            { description: 'Payment Status', metaData: {} },
        ];

        reportDto.rows = invoices.map((inv) => ({
            'Doc No': inv.docno || '',
            'Invoice Date': inv.invoiceDate || '',
            Customer: inv.customerName || inv.customerId || '',
            Area: inv.areaName || 'Unassigned',
            'Territory Manager': inv.territoryManagerName || inv.territoryManagerId || '',
            'Sales Type': inv.salesTypeName || inv.salesTypeId || '',
            Contract: inv.contractName || inv.contractId || '',
            'Invoice Amount': Number(inv.invoiceAmount ?? 0),
            'Tax Amount': Number(inv.taxAmount ?? 0),
            'Final Amount': Number(inv.finalAmount ?? 0),
            'Payment Status': inv.paymentStatus || '',
        }));

        return reportDto;
    }

    private buildAreaWorkbookReportDto(event: ReportEventDto, invoices: InvoiceDto[]): ReportDto {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Invoice Per Date';
        reportDto.reportFilename = `${event.reportName || 'Invoice-Per-Date'}.xlsx`;

        const headers = [
            { description: 'Doc No', metaData: {} },
            { description: 'Invoice Date', metaData: {} },
            { description: 'Customer', metaData: {} },
            { description: 'Area', metaData: {} },
            { description: 'Territory Manager', metaData: {} },
            { description: 'Sales Type', metaData: {} },
            { description: 'Contract', metaData: {} },
            { description: 'Invoice Amount', metaData: {} },
            { description: 'Tax Amount', metaData: {} },
            { description: 'Final Amount', metaData: {} },
            { description: 'Payment Status', metaData: {} },
        ];

        const grouped = new Map<string, InvoiceDto[]>();
        for (const inv of invoices) {
            const key = inv.areaId || 'UNASSIGNED';
            const list = grouped.get(key) || [];
            list.push(inv);
            grouped.set(key, list);
        }

        const used = new Set<string>();
        const sheets = Array.from(grouped.values()).map((areaInvoices) => {
            const sorted = this.sortInvoicesByDate(areaInvoices);
            const sample = sorted[0];
            const baseName = sample?.areaName || 'Unassigned';
            const name = this.uniqueSheetName(baseName, used);
            return {
                name,
                headers,
                rows: this.buildReportDto(event, sorted).rows || [],
            };
        });

        reportDto.workbook = { sheets };
        return reportDto;
    }

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
