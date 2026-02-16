import { AreaDatabaseService } from '@customer-database-service';
import {
    ContractDto,
    FileDetailsDto,
    InvoiceDetailsDto,
    InvoiceDto,
    ProductDto,
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
import { ProductDatabaseService } from '@product-database-service';
import { ReportDatabaseService } from '@report-database-service';

type InvoicePerDatePerProductRow = {
    'Doc No': string;
    'Invoice Date': string;
    Customer: string;
    Area: string;
    'Territory Manager': string;
    'Sales Type': string;
    Contract: string;
    'Invoice Amount': number;
    'Tax Amount': number;
    'Final Amount': number;
    'Payment Status': string;
    Product: string;
    'Lot No': string;
    'Product Qty': number;
    'Product Amount': number;
};

@Injectable()
export class InvoicePerDatePerProductReportHandlerService {
    private readonly logger = new Logger(InvoicePerDatePerProductReportHandlerService.name);

    constructor(
        private readonly invoiceDatabaseService: InvoiceDatabaseService,
        private readonly salesTypeDatabaseService: SalesTypeDatabaseService,
        private readonly contractDatabaseService: ContractDatabaseService,
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseService,
        private readonly areaDatabaseService: AreaDatabaseService,
        private readonly productDatabaseService: ProductDatabaseService,
        private readonly reportDatabaseService: ReportDatabaseService,
        private readonly excelGeneratorService: ExcelGeneratorService
    ) {}

    async handleInvoicePerDatePerProductReport(event: ReportEventDto): Promise<void> {
        this.logger.log(`Processing INVOICE_PER_DATE_PER_PRODUCT report: reportId=${event.reportId}`);

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
            const selectedProducts = this.buildSelectedProductMap(event);
            if (selectedProducts.size === 0) {
                await this.updateReportStatus(
                    event,
                    ReportStatusEnum.FAILED,
                    undefined,
                    undefined,
                    'At least one product must be selected to generate this report'
                );
                return;
            }

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
                'invoiceDetails',
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

            const productMap = await this.buildProductLookupMap();
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

            const hasAnyMatchingRows = this.hasAnyMatchingInvoiceDetailRows(invoices, productMap, selectedProducts);
            if (!hasAnyMatchingRows) {
                await this.updateReportStatus(
                    event,
                    ReportStatusEnum.FAILED,
                    undefined,
                    undefined,
                    'No invoice details found matching the selected product filters'
                );
                return;
            }

            const reportDto = await this.buildReportDto(event, invoices, productMap, selectedProducts, areaMap);
            const fileDetails = await this.excelGeneratorService.generateExcelReport(reportDto);

            await this.updateReportStatus(event, ReportStatusEnum.READY, reportDto.reportFilename, fileDetails);

            this.logger.log(
                `✅ INVOICE_PER_DATE_PER_PRODUCT report generated: reportId=${event.reportId}, invoices=${invoices.length}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            this.logger.error(`❌ INVOICE_PER_DATE_PER_PRODUCT report failed: reportId=${event.reportId}`, error);
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
        const areaIds = this.getAreaIds(event);
        const areaId = areaIds.length === 1 ? areaIds[0] : undefined;
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
        const areaIds = this.getAreaIds(event);
        const salesTypeIds = (event.filters?.salesTypeIds || []).filter(Boolean);
        const salesTypeId = event.filters?.salesTypeId;
        const effectiveSalesTypeIds = salesTypeIds.length > 0 ? salesTypeIds : salesTypeId ? [salesTypeId] : [];
        const contractIds = (event.filters?.contractIds || []).filter(Boolean);
        const contractId = event.filters?.contractId;
        const effectiveContractIds = contractIds.length > 0 ? contractIds : contractId ? [contractId] : [];

        const customerIdSet = effectiveCustomerIds.length > 0 ? new Set(effectiveCustomerIds) : undefined;
        const salesTypeIdSet = effectiveSalesTypeIds.length > 0 ? new Set(effectiveSalesTypeIds) : undefined;
        const contractIdSet =
            effectiveContractIds.length > 0 ? new Set(effectiveContractIds.map((x) => x.trim())) : undefined;

        return invoices.filter((inv) => {
            if (customerIdSet && !customerIdSet.has(inv.customerId || '')) return false;
            if (areaIds.length > 0 && (!inv.areaId || !areaIds.includes(inv.areaId))) return false;
            if (salesTypeIdSet && !salesTypeIdSet.has(inv.salesTypeId || '')) return false;
            if (contractIdSet) {
                const invContractId = typeof inv.contractId === 'string' ? inv.contractId.trim() : '';
                if (!contractIdSet.has(invContractId)) return false;
            }
            return true;
        });
    }

    private getAreaIds(event: ReportEventDto): string[] {
        const ids = event.filters?.areaIds?.filter(Boolean) || [];
        if (ids.length > 0) return ids;
        return event.filters?.areaId ? [event.filters.areaId] : [];
    }

    private buildSelectedProductMap(event: ReportEventDto): Map<string, { lotNos?: string[] }> {
        const map = new Map<string, { lotNos?: string[] }>();
        const selections = event.filters?.productSelections || [];
        for (const sel of selections) {
            const rawProductId = sel?.productId;
            const productId = typeof rawProductId === 'string' ? rawProductId.trim() : '';
            if (!productId) continue;
            const lotNos = this.parseLotNoList(sel.lotNo);
            map.set(productId, { lotNos: lotNos.length > 0 ? lotNos : undefined });
        }
        return map;
    }

    private parseLotNoList(raw?: string): string[] {
        if (!raw) return [];
        return raw
            .split(',')
            .map((x) => x.trim())
            .filter((x) => x.length > 0);
    }

    private matchesProductFilter(
        detail: InvoiceDetailsDto,
        selectedProducts: Map<string, { lotNos?: string[] }>
    ): boolean {
        if (selectedProducts.size === 0) return true;
        const rawProductId = (detail as unknown as { productId?: unknown })?.productId;
        const productId = typeof rawProductId === 'string' ? rawProductId.trim() : '';
        if (!productId) return false;
        const selection = selectedProducts.get(productId);
        if (!selection) return false;
        const requiredLots = selection.lotNos;
        if (requiredLots && requiredLots.length > 0) {
            const rawLot = (detail as unknown as { lotNo?: unknown })?.lotNo;
            const lineLot = typeof rawLot === 'string' ? rawLot.trim() : '';
            if (!lineLot) return false;
            if (!requiredLots.includes(lineLot)) return false;
        }
        return true;
    }

    private toNumber(value: unknown, fallback = 0): number {
        const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
        return Number.isFinite(num) ? num : fallback;
    }

    private async buildProductLookupMap(): Promise<Map<string, string>> {
        const map = new Map<string, string>();
        let cursorPointer: string | undefined = undefined;
        let direction = '';
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const page = await this.productDatabaseService.findRecordsByPagination(
                limit,
                direction,
                cursorPointer || ''
            );
            page.data.forEach((product: ProductDto) => {
                if (product.productId && product.productName) {
                    map.set(product.productId, product.productName);
                }
            });
            cursorPointer = page.nextCursorPointer ? JSON.stringify(page.nextCursorPointer) : undefined;
            direction = 'next';
            hasMore = !!page.nextCursorPointer;
        }

        return map;
    }

    private hasAnyMatchingInvoiceDetailRows(
        invoices: InvoiceDto[],
        productMap: Map<string, string>,
        selectedProducts: Map<string, { lotNos?: string[] }>
    ): boolean {
        for (const invoice of invoices) {
            const details: InvoiceDetailsDto[] = (invoice.invoiceDetails || []) as InvoiceDetailsDto[];
            for (const detail of details) {
                if (!this.matchesProductFilter(detail, selectedProducts)) continue;
                const productId = detail.productId;
                const productNameFromLine = detail.productName;
                const productName = productId
                    ? productMap.get(productId) || productNameFromLine || productId
                    : productNameFromLine || 'Unknown Product';
                if (productName) return true;
            }
        }
        return false;
    }

    private buildHeaders() {
        return [
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
            { description: 'Product', metaData: {} },
            { description: 'Lot No', metaData: {} },
            { description: 'Product Qty', metaData: {} },
            { description: 'Product Amount', metaData: {} },
        ];
    }

    private buildDetailRows(
        invoices: InvoiceDto[],
        productMap: Map<string, string>,
        selectedProducts: Map<string, { lotNos?: string[] }>
    ): InvoicePerDatePerProductRow[] {
        const rows: InvoicePerDatePerProductRow[] = [];

        const sortedInvoices = [...invoices].sort((a, b) => {
            const aTime = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0;
            const bTime = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0;
            return aTime - bTime;
        });

        for (const inv of sortedInvoices) {
            const details: InvoiceDetailsDto[] = (inv.invoiceDetails || []) as InvoiceDetailsDto[];
            for (const detail of details) {
                if (!this.matchesProductFilter(detail, selectedProducts)) continue;

                const productId = detail.productId;
                const productNameFromLine = detail.productName;
                const productName = productId
                    ? productMap.get(productId) || productNameFromLine || productId
                    : productNameFromLine || 'Unknown Product';

                const qty = this.toNumber(detail.qty ?? 0);
                const amountRaw = detail.amount;
                const priceRaw = detail.price;
                const amount = amountRaw != null ? this.toNumber(amountRaw) : qty * this.toNumber(priceRaw ?? 0);

                rows.push({
                    'Doc No': inv.docno || '',
                    'Invoice Date': inv.invoiceDate || '',
                    Customer: inv.customerName || inv.customerId || '',
                    Area: inv.areaName || 'Unassigned',
                    'Territory Manager': inv.territoryManagerName || inv.territoryManagerId || '',
                    'Sales Type': inv.salesTypeName || inv.salesTypeId || '',
                    Contract: inv.contractName || inv.contractId || '',
                    'Invoice Amount': this.toNumber(inv.invoiceAmount ?? 0),
                    'Tax Amount': this.toNumber(inv.taxAmount ?? 0),
                    'Final Amount': this.toNumber(inv.finalAmount ?? 0),
                    'Payment Status': inv.paymentStatus || '',
                    Product: productName,
                    'Lot No': detail.lotNo || '',
                    'Product Qty': qty,
                    'Product Amount': amount,
                });
            }
        }

        return rows;
    }

    private async buildReportDto(
        event: ReportEventDto,
        invoices: InvoiceDto[],
        productMap: Map<string, string>,
        selectedProducts: Map<string, { lotNos?: string[] }>,
        areaMap: Map<string, string>
    ): Promise<ReportDto> {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Invoice Per Date Per Product';
        reportDto.reportFilename = `${event.reportName || 'Invoice-Per-Date-Per-Product'}.xlsx`;

        const headers = this.buildHeaders();

        const separateByArea = !!event.filters?.separateByArea;
        if (!separateByArea) {
            reportDto.headers = headers;
            reportDto.rows = this.buildDetailRows(invoices, productMap, selectedProducts);
            return reportDto;
        }

        const invoicesByArea = new Map<string, InvoiceDto[]>();
        for (const inv of invoices) {
            const areaId = inv.areaId || 'UNASSIGNED';
            const list = invoicesByArea.get(areaId);
            if (list) list.push(inv);
            else invoicesByArea.set(areaId, [inv]);
        }

        const sheets: NonNullable<ReportDto['workbook']>['sheets'] = [];
        const usedNames = new Set<string>();

        const makeUniqueName = (name: string) => {
            let candidate = name;
            let n = 2;
            while (usedNames.has(candidate)) {
                candidate = `${name} (${n})`;
                n += 1;
            }
            usedNames.add(candidate);
            return candidate;
        };

        const stripControlChars = (value: string) =>
            Array.from(value)
                .filter((ch) => {
                    const code = ch.charCodeAt(0);
                    return code >= 32 && code !== 127;
                })
                .join('');

        const sanitizeSheetName = (raw: string) => {
            const cleaned = stripControlChars(raw)
                .replace(/[\u005B\u005D\u003A\u002A\u003F\u002F\u005C]/g, ' ')
                .trim();
            const limited = cleaned.length > 31 ? cleaned.slice(0, 31).trim() : cleaned;
            return limited || 'Sheet';
        };

        for (const [areaId, areaInvoices] of invoicesByArea.entries()) {
            const areaName = areaId === 'UNASSIGNED' ? 'Unassigned' : areaMap.get(areaId) || areaId;
            const baseName = sanitizeSheetName(areaName);
            const sheetName = makeUniqueName(baseName);
            const areaRows = this.buildDetailRows(areaInvoices, productMap, selectedProducts);
            if (areaRows.length === 0) continue;
            sheets.push({
                name: sheetName,
                headers,
                rows: areaRows,
            });
        }

        if (sheets.length === 0) {
            reportDto.headers = headers;
            reportDto.rows = [];
            return reportDto;
        }

        reportDto.workbook = { sheets };

        return reportDto;
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
