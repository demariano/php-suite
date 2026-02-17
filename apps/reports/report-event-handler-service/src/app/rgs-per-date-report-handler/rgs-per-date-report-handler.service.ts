import { AreaDatabaseService } from '@customer-database-service';
import {
    FileDetailsDto,
    InvoiceDetailsDto,
    ReportDto,
    ReportEventDto,
    ReportFileDetailDto,
    ReportStatusEnum,
    ReturnGoodSoldDto,
} from '@dto';
import { ExcelGeneratorService } from '@excel-generator-service';
import { ReturnGoodSoldDatabaseService } from '@invoicing-database-service';
import { Injectable, Logger } from '@nestjs/common';
import { ProductDatabaseService } from '@product-database-service';
import { ReportDatabaseService } from '@report-database-service';

type RgsPerDateRow = Record<string, string | number>;

@Injectable()
export class RgsPerDateReportHandlerService {
    private readonly logger = new Logger(RgsPerDateReportHandlerService.name);

    constructor(
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseService,
        private readonly areaDatabaseService: AreaDatabaseService,
        private readonly productDatabaseService: ProductDatabaseService,
        private readonly reportDatabaseService: ReportDatabaseService,
        private readonly excelGeneratorService: ExcelGeneratorService
    ) {}

    async handleRgsPerDateReport(event: ReportEventDto): Promise<void> {
        this.logger.log(`Processing RGS_PER_DATE report: reportId=${event.reportId}`);

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
            // Build product selection map for sub-row filtering
            const selectedProducts = this.buildSelectedProductMap(event);
            const includeProductColumns = selectedProducts.size > 0;

            // Fetch RGS records
            let rgsRecords = await this.fetchRgsRecords(event, startDate, endDate);

            // Apply optional client-side filters
            rgsRecords = this.applyOptionalFilters(rgsRecords, event, selectedProducts);

            if (rgsRecords.length === 0) {
                await this.updateReportStatus(
                    event,
                    ReportStatusEnum.FAILED,
                    undefined,
                    undefined,
                    'No return goods sold records found matching the selected filters'
                );
                return;
            }

            // Build lookup maps for enrichment
            const areaMap = await this.buildAreaLookupMap();
            let productMap = new Map<string, string>();

            if (includeProductColumns) {
                productMap = await this.buildProductLookupMap();

                // Verify at least one matching product detail row exists
                if (!this.hasAnyMatchingDetailRows(rgsRecords, productMap, selectedProducts)) {
                    // No product sub-rows would render — fall back to no product columns
                    // (still generate the report, just without product columns)
                }
            }

            // Enrich area names
            rgsRecords = rgsRecords.map((rgs) => {
                if (rgs.areaId && areaMap.has(rgs.areaId)) {
                    return { ...rgs, areaName: areaMap.get(rgs.areaId) };
                }
                return rgs;
            });

            // Sort by dateReturned
            rgsRecords = this.sortByDateReturned(rgsRecords);

            // Build report DTO
            const separateByArea = !!event.filters?.separateByArea;
            const opts = { includeProductColumns, productMap, selectedProducts };

            const reportDto = separateByArea
                ? this.buildAreaWorkbookReportDto(event, rgsRecords, opts)
                : this.buildSingleSheetReportDto(event, rgsRecords, opts);

            // Generate Excel
            const fileDetails = await this.excelGeneratorService.generateExcelReport(reportDto);

            // Update status
            await this.updateReportStatus(event, ReportStatusEnum.READY, reportDto.reportFilename, fileDetails);

            this.logger.log(
                `✅ RGS_PER_DATE report generated: reportId=${event.reportId}, records=${rgsRecords.length}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            this.logger.error(`❌ RGS_PER_DATE report failed: reportId=${event.reportId}`, error);
            await this.updateReportStatus(event, ReportStatusEnum.FAILED, undefined, undefined, errorMessage);
            throw error;
        }
    }

    // ─── Data Fetching ───────────────────────────────────────────────────

    private async fetchRgsRecords(
        event: ReportEventDto,
        startDate: string,
        endDate: string
    ): Promise<ReturnGoodSoldDto[]> {
        const customerIds = (event.filters?.customerIds || []).filter(Boolean);
        const customerId = event.filters?.customerId;
        const effectiveCustomerIds = customerIds.length > 0 ? customerIds : customerId ? [customerId] : [];

        // If single customer, use the optimised per-customer query
        if (effectiveCustomerIds.length === 1) {
            return await this.returnGoodSoldDatabaseService.getActiveRGSByCustomerAndDateRange(
                effectiveCustomerIds[0],
                startDate,
                endDate
            );
        }

        // Otherwise fetch all active RGS in date range (detailed — includes originalInvoiceDetails)
        return await this.returnGoodSoldDatabaseService.getActiveRGSByDateRangeDetailed(startDate, endDate);
    }

    // ─── Filtering ───────────────────────────────────────────────────────

    private applyOptionalFilters(
        records: ReturnGoodSoldDto[],
        event: ReportEventDto,
        selectedProducts: Map<string, { lotNos?: string[] }>
    ): ReturnGoodSoldDto[] {
        const filters = event.filters || {};

        // Customer filter (multi)
        const customerIds = (filters.customerIds || []).filter(Boolean);
        const customerId = filters.customerId;
        const effectiveCustomerIds = customerIds.length > 0 ? customerIds : customerId ? [customerId] : [];
        const customerIdSet = effectiveCustomerIds.length > 0 ? new Set(effectiveCustomerIds) : undefined;

        // Area filter (multi)
        const areaIds = (filters.areaIds || []).filter(Boolean);
        const areaId = filters.areaId;
        const effectiveAreaIds = areaIds.length > 0 ? areaIds : areaId ? [areaId] : [];
        const areaIdSet = effectiveAreaIds.length > 0 ? new Set(effectiveAreaIds) : undefined;

        // Invoice Doc No filter (comma-separated → array already split by frontend)
        const invoiceDocNos = (filters.invoiceDocNos || []).filter(Boolean);
        const invoiceDocNoSet = invoiceDocNos.length > 0 ? new Set(invoiceDocNos.map((d) => d.trim())) : undefined;

        // RGS Doc No filter
        const rgsDocNos = (filters.rgsDocNos || []).filter(Boolean);
        const rgsDocNoSet = rgsDocNos.length > 0 ? new Set(rgsDocNos.map((d) => d.trim())) : undefined;

        const hasProductFilters = selectedProducts.size > 0;

        return records.filter((rgs) => {
            if (customerIdSet && !customerIdSet.has(rgs.customerId || '')) return false;
            if (areaIdSet && !areaIdSet.has(rgs.areaId || '')) return false;
            if (invoiceDocNoSet && !invoiceDocNoSet.has((rgs.invoiceDocno || '').trim())) return false;
            if (rgsDocNoSet && !rgsDocNoSet.has((rgs.rgsDocno || '').trim())) return false;

            if (hasProductFilters) {
                const details: InvoiceDetailsDto[] = (rgs.originalInvoiceDetails || []) as InvoiceDetailsDto[];
                const hasMatch = details.some((d) => this.matchesProductFilter(d, selectedProducts));
                if (!hasMatch) return false;
            }

            return true;
        });
    }

    // ─── Sorting ─────────────────────────────────────────────────────────

    private sortByDateReturned(records: ReturnGoodSoldDto[]): ReturnGoodSoldDto[] {
        return [...records].sort((a, b) => {
            const aTime = a.dateReturned ? new Date(a.dateReturned).getTime() : 0;
            const bTime = b.dateReturned ? new Date(b.dateReturned).getTime() : 0;
            return aTime - bTime;
        });
    }

    // ─── Report Building ─────────────────────────────────────────────────

    private buildHeaders(includeProductColumns: boolean) {
        const base = [
            { description: 'RGS Doc No', metaData: {} },
            { description: 'Invoice Doc No', metaData: {} },
            { description: 'Date Returned', metaData: {} },
            { description: 'Customer', metaData: {} },
            { description: 'Area', metaData: {} },
            { description: 'Status', metaData: {} },
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
        records: ReturnGoodSoldDto[],
        opts: {
            includeProductColumns: boolean;
            productMap?: Map<string, string>;
            selectedProducts?: Map<string, { lotNos?: string[] }>;
        }
    ): RgsPerDateRow[] {
        const rows: RgsPerDateRow[] = [];
        const includeProductColumns = opts.includeProductColumns;
        const selectedProducts = opts.selectedProducts;

        for (const rgs of records) {
            const summary: RgsPerDateRow = {
                'RGS Doc No': rgs.rgsDocno || '',
                'Invoice Doc No': rgs.invoiceDocno || '',
                'Date Returned': rgs.dateReturned || '',
                Customer: rgs.customerName || rgs.customerId || '',
                Area: rgs.areaName || 'Unassigned',
                Status: rgs.status || '',
            };

            if (includeProductColumns) {
                summary['Product'] = '';
                summary['Lot No'] = '';
                summary['Product Qty'] = '';
                summary['Product Amount'] = '';
            }

            rows.push(summary);

            if (!includeProductColumns) continue;

            const details: InvoiceDetailsDto[] = (rgs.originalInvoiceDetails || []) as InvoiceDetailsDto[];
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
                    'RGS Doc No': '',
                    'Invoice Doc No': '',
                    'Date Returned': '',
                    Customer: '',
                    Area: '',
                    Status: '',
                    Product: productName,
                    'Lot No': detail.lotNo || '',
                    'Product Qty': qty,
                    'Product Amount': amount,
                });
            }
        }

        return rows;
    }

    private buildSingleSheetReportDto(
        event: ReportEventDto,
        records: ReturnGoodSoldDto[],
        opts: {
            includeProductColumns: boolean;
            productMap?: Map<string, string>;
            selectedProducts?: Map<string, { lotNos?: string[] }>;
        }
    ): ReportDto {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Return Goods Sold Per Date';
        reportDto.reportFilename = `${event.reportName || 'RGS-Per-Date'}.xlsx`;
        reportDto.headers = this.buildHeaders(opts.includeProductColumns);
        reportDto.rows = this.buildRows(records, opts);
        return reportDto;
    }

    private buildAreaWorkbookReportDto(
        event: ReportEventDto,
        records: ReturnGoodSoldDto[],
        opts: {
            includeProductColumns: boolean;
            productMap?: Map<string, string>;
            selectedProducts?: Map<string, { lotNos?: string[] }>;
        }
    ): ReportDto {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Return Goods Sold Per Date';
        reportDto.reportFilename = `${event.reportName || 'RGS-Per-Date'}.xlsx`;

        const headers = this.buildHeaders(opts.includeProductColumns);

        // Group by area
        const grouped = new Map<string, ReturnGoodSoldDto[]>();
        for (const rgs of records) {
            const key = rgs.areaId || 'UNASSIGNED';
            const list = grouped.get(key) || [];
            list.push(rgs);
            grouped.set(key, list);
        }

        const used = new Set<string>();
        const sheets = Array.from(grouped.values()).map((areaRecords) => {
            const sorted = this.sortByDateReturned(areaRecords);
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

    // ─── Product Filter Helpers ──────────────────────────────────────────

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

    private hasAnyMatchingDetailRows(
        records: ReturnGoodSoldDto[],
        productMap: Map<string, string>,
        selectedProducts: Map<string, { lotNos?: string[] }>
    ): boolean {
        for (const rgs of records) {
            const details: InvoiceDetailsDto[] = (rgs.originalInvoiceDetails || []) as InvoiceDetailsDto[];
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

    // ─── Lookup Maps ─────────────────────────────────────────────────────

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

    // ─── Utility ─────────────────────────────────────────────────────────

    private toNumber(value: unknown, fallback = 0): number {
        const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
        return Number.isFinite(num) ? num : fallback;
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
