import { AreaDatabaseService } from '@customer-database-service';
import {
    ContractDto,
    FileDetailsDto,
    InvoiceDetailsDto,
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
import { ProductDatabaseService } from '@product-database-service';
import { ReportDatabaseService } from '@report-database-service';

type InvoicePerDatePerAreaRow = Record<string, string | number>;

@Injectable()
export class InvoicePerDatePerAreaReportHandlerService {
    private readonly logger = new Logger(InvoicePerDatePerAreaReportHandlerService.name);

    constructor(
        private readonly invoiceDatabaseService: InvoiceDatabaseService,
        private readonly areaDatabaseService: AreaDatabaseService,
        private readonly salesTypeDatabaseService: SalesTypeDatabaseService,
        private readonly contractDatabaseService: ContractDatabaseService,
        private readonly territoryManagerDatabaseService: TerritoryManagerDatabaseService,
        private readonly productDatabaseService: ProductDatabaseService,
        private readonly reportDatabaseService: ReportDatabaseService,
        private readonly excelGeneratorService: ExcelGeneratorService
    ) {}

    async handleInvoicePerDatePerAreaReport(event: ReportEventDto): Promise<void> {
        this.logger.log(`Processing INVOICE_PER_DATE_PER_AREA report: reportId=${event.reportId}`);

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
            const includeProductColumns = selectedProducts.size > 0;
            const includeInvoiceDetails = !!event.filters?.includeInvoiceDetails;

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

            if (includeProductColumns || includeInvoiceDetails) {
                fields.push('invoiceDetails');
            }

            let invoices = await this.fetchInvoices(event, startDate, endDate, fields);
            invoices = this.applyOptionalFilters(invoices, event, selectedProducts);

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

            const productMap = includeProductColumns ? await this.buildProductLookupMap() : undefined;

            invoices = invoices
                .map((invoice) => {
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
                })
                .sort((a, b) => {
                    const aTime = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0;
                    const bTime = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0;
                    return aTime - bTime;
                });

            if (includeProductColumns && productMap) {
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
            }

            const separateByArea = event.filters?.separateByArea ?? true;
            const reportDto = separateByArea
                ? this.buildAreaWorkbookReportDto(event, invoices, {
                      includeProductColumns,
                      includeInvoiceDetails,
                      productMap,
                      selectedProducts,
                  })
                : this.buildSingleSheetReportDto(event, invoices, {
                      includeProductColumns,
                      includeInvoiceDetails,
                      productMap,
                      selectedProducts,
                  });
            const fileDetails = await this.excelGeneratorService.generateExcelReport(reportDto);

            await this.updateReportStatus(event, ReportStatusEnum.READY, reportDto.reportFilename, fileDetails);

            this.logger.log(
                `✅ INVOICE_PER_DATE_PER_AREA report generated: reportId=${event.reportId}, records=${invoices.length}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            this.logger.error(`❌ INVOICE_PER_DATE_PER_AREA report failed: reportId=${event.reportId}`, error);
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

        if (areaIds.length === 1) {
            return await this.invoiceDatabaseService.getInvoicesByAreaAndDateRange(
                areaIds[0],
                startDate,
                endDate,
                fields
            );
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

    private applyOptionalFilters(
        invoices: InvoiceDto[],
        event: ReportEventDto,
        selectedProducts?: Map<string, { lotNos?: string[] }>
    ): InvoiceDto[] {
        const customerIds = (event.filters?.customerIds || []).filter(Boolean);
        const customerId = event.filters?.customerId;
        const effectiveCustomerIds = customerIds.length > 0 ? customerIds : customerId ? [customerId] : [];
        const areaIds = this.getAreaIds(event);
        const salesTypeIds = (event.filters?.salesTypeIds || []).filter(Boolean);
        const salesTypeId = event.filters?.salesTypeId;
        const effectiveSalesTypeIds = salesTypeIds.length > 0 ? salesTypeIds : salesTypeId ? [salesTypeId] : [];
        const paymentStatuses = (event.filters?.paymentStatus || []).filter(Boolean);
        const contractIds = (event.filters?.contractIds || []).filter(Boolean);
        const contractId = event.filters?.contractId;
        const effectiveContractIds = contractIds.length > 0 ? contractIds : contractId ? [contractId] : [];

        const areaIdSet = areaIds.length > 0 ? new Set(areaIds) : undefined;
        const customerIdSet = effectiveCustomerIds.length > 0 ? new Set(effectiveCustomerIds) : undefined;
        const salesTypeIdSet = effectiveSalesTypeIds.length > 0 ? new Set(effectiveSalesTypeIds) : undefined;
        const paymentStatusSet = paymentStatuses.length > 0 ? new Set(paymentStatuses) : undefined;
        const contractIdSet =
            effectiveContractIds.length > 0 ? new Set(effectiveContractIds.map((x) => x.trim())) : undefined;
        const hasProductFilters = !!selectedProducts && selectedProducts.size > 0;

        return invoices.filter((inv) => {
            if (customerIdSet && !customerIdSet.has(inv.customerId || '')) return false;
            if (areaIdSet && !areaIdSet.has(inv.areaId || '')) return false;
            if (salesTypeIdSet && !salesTypeIdSet.has(inv.salesTypeId || '')) return false;
            if (paymentStatusSet && !paymentStatusSet.has(inv.paymentStatus || '')) return false;
            if (contractIdSet) {
                const invContractId = typeof inv.contractId === 'string' ? inv.contractId.trim() : '';
                if (!contractIdSet.has(invContractId)) return false;
            }
            if (hasProductFilters) {
                const details: InvoiceDetailsDto[] = (inv.invoiceDetails || []) as InvoiceDetailsDto[];
                const hasMatch = details.some((d) => this.matchesProductFilter(d, selectedProducts));
                if (!hasMatch) return false;
            }
            return true;
        });
    }

    private async buildAreaLookupMap(): Promise<Map<string, string>> {
        const areaMap = new Map<string, string>();
        let cursorPointer: string | undefined = undefined;
        let direction = '';
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const page = await this.areaDatabaseService.findRecordsByPagination(limit, direction, cursorPointer || '');
            page.data.forEach((area: { areaId?: string; areaName?: string }) => {
                if (area.areaId && area.areaName) {
                    areaMap.set(area.areaId, area.areaName);
                }
            });
            cursorPointer = page.nextCursorPointer ? JSON.stringify(page.nextCursorPointer) : undefined;
            direction = 'next';
            hasMore = !!page.nextCursorPointer;
        }

        return areaMap;
    }

    private buildHeaders(includeProductColumns: boolean) {
        const base = [
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

        if (!includeProductColumns) return base;

        return [
            ...base,
            { description: 'Product', metaData: {} },
            { description: 'Lot No', metaData: {} },
            { description: 'Product Qty', metaData: {} },
            { description: 'Product Amount', metaData: {} },
        ];
    }

    private buildRows(
        invoices: InvoiceDto[],
        opts: {
            includeProductColumns: boolean;
            includeInvoiceDetails: boolean;
            productMap?: Map<string, string>;
            selectedProducts?: Map<string, { lotNos?: string[] }>;
        }
    ): InvoicePerDatePerAreaRow[] {
        const rows: InvoicePerDatePerAreaRow[] = [];
        const includeProductColumns = opts.includeProductColumns;
        const includeInvoiceDetails = opts.includeInvoiceDetails;
        const selectedProducts = opts.selectedProducts;

        for (const inv of invoices) {
            const summary: InvoicePerDatePerAreaRow = {
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
            };

            if (includeProductColumns) {
                summary['Product'] = '';
                summary['Lot No'] = '';
                summary['Product Qty'] = '';
                summary['Product Amount'] = '';
            }

            rows.push(summary);

            if (!includeProductColumns && !includeInvoiceDetails) continue;

            const details: InvoiceDetailsDto[] = (inv.invoiceDetails || []) as InvoiceDetailsDto[];

            // Include invoice details sub-rows (sub-header style, no product column filter)
            if (includeInvoiceDetails && !includeProductColumns) {
                if (details.length > 0) {
                    rows.push(this.buildInvoiceDetailSubHeaderRow());
                    for (const detail of details) {
                        rows.push(this.buildInvoiceDetailSubRow(detail));
                    }
                }
                continue;
            }

            // Include product column sub-rows (existing behavior)
            for (const detail of details) {
                if (selectedProducts && !this.matchesProductFilter(detail, selectedProducts)) continue;

                const qty = this.toNumber(detail.qty, 0);
                const explicitAmount = this.toNumber(detail.amount, Number.NaN);
                const price = this.toNumber(detail.price, 0);
                const amount = Number.isFinite(explicitAmount) ? explicitAmount : qty * price;

                const productId = detail.productId;
                const productNameFromLine = detail.productName;
                const productName = productId
                    ? opts.productMap?.get(productId) || productNameFromLine || productId
                    : productNameFromLine || 'Unknown Product';

                rows.push({
                    'Doc No': '',
                    'Invoice Date': '',
                    Customer: '',
                    Area: '',
                    'Territory Manager': '',
                    'Sales Type': '',
                    Contract: '',
                    'Invoice Amount': '',
                    'Tax Amount': '',
                    'Final Amount': '',
                    'Payment Status': '',
                    Product: productName,
                    'Lot No': detail.lotNo || '',
                    'Product Qty': qty,
                    'Product Amount': amount,
                });
            }
        }

        return rows;
    }

    private buildInvoiceDetailSubHeaderRow(): InvoicePerDatePerAreaRow {
        return {
            'Doc No': '',
            'Invoice Date': 'Product',
            Customer: 'Qty',
            Area: 'Cost',
            'Territory Manager': 'Price',
            'Sales Type': 'Amount',
            Contract: '',
            'Invoice Amount': '',
            'Tax Amount': '',
            'Final Amount': '',
            'Payment Status': '',
            __subHeader: true,
        } as unknown as InvoicePerDatePerAreaRow;
    }

    private buildInvoiceDetailSubRow(detail: InvoiceDetailsDto): InvoicePerDatePerAreaRow {
        const qty = this.toNumber(detail.qty, 0);
        const explicitAmount = this.toNumber(detail.amount, Number.NaN);
        const price = this.toNumber(detail.price, 0);
        const cost = this.toNumber(detail.cost, 0);
        const amount = Number.isFinite(explicitAmount) ? explicitAmount : qty * price;

        return {
            'Doc No': '',
            'Invoice Date': detail.productName || detail.productId || '',
            Customer: qty,
            Area: cost,
            'Territory Manager': price,
            'Sales Type': amount,
            Contract: '',
            'Invoice Amount': '',
            'Tax Amount': '',
            'Final Amount': '',
            'Payment Status': '',
        };
    }

    private buildSingleSheetReportDto(
        event: ReportEventDto,
        invoices: InvoiceDto[],
        opts: {
            includeProductColumns: boolean;
            includeInvoiceDetails: boolean;
            productMap?: Map<string, string>;
            selectedProducts?: Map<string, { lotNos?: string[] }>;
        }
    ): ReportDto {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Invoice Per Date Per Area';
        reportDto.reportFilename = `${event.reportName || 'Invoice-Per-Date-Per-Area'}.xlsx`;
        reportDto.headers = this.buildHeaders(opts.includeProductColumns);
        reportDto.rows = this.buildRows(invoices, opts);
        return reportDto;
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

    private buildAreaWorkbookReportDto(
        event: ReportEventDto,
        invoices: InvoiceDto[],
        opts: {
            includeProductColumns: boolean;
            includeInvoiceDetails: boolean;
            productMap?: Map<string, string>;
            selectedProducts?: Map<string, { lotNos?: string[] }>;
        }
    ): ReportDto {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Invoice Per Date Per Area';
        reportDto.reportFilename = `${event.reportName || 'Invoice-Per-Date-Per-Area'}.xlsx`;

        const headers = this.buildHeaders(opts.includeProductColumns);
        const grouped = new Map<string, InvoiceDto[]>();
        for (const inv of invoices) {
            const key = inv.areaId || 'UNASSIGNED';
            const list = grouped.get(key) || [];
            list.push(inv);
            grouped.set(key, list);
        }

        const used = new Set<string>();
        const sheets = Array.from(grouped.values()).map((areaInvoices) => {
            const sorted = [...areaInvoices].sort((a, b) => {
                const aTime = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0;
                const bTime = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0;
                return aTime - bTime;
            });
            const sample = sorted[0];
            const baseName = sample?.areaName || 'Unassigned';
            const name = this.uniqueSheetName(baseName, used);
            return {
                name,
                headers,
                rows: this.buildRows(sorted, opts),
            };
        });

        reportDto.workbook = { sheets };
        return reportDto;
    }

    private getAreaIds(event: ReportEventDto): string[] {
        const ids = event.filters?.areaIds && event.filters.areaIds.length > 0 ? event.filters.areaIds : undefined;
        if (ids) return ids;
        if (event.filters?.areaId) return [event.filters.areaId];
        return [];
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
            page.data.forEach((product: { productId?: string; productName?: string }) => {
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
