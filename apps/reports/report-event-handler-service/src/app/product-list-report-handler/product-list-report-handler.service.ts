import { FileDetailsDto, ProductDto, ReportDto, ReportEventDto, ReportFileDetailDto, ReportStatusEnum } from '@dto';
import { ExcelGeneratorService } from '@excel-generator-service';
import { Injectable, Logger } from '@nestjs/common';
import { ProductDatabaseService } from '@product-database-service';
import { ReportDatabaseService } from '@report-database-service';

type ProductListRow = Record<string, string | number>;

@Injectable()
export class ProductListReportHandlerService {
    private readonly logger = new Logger(ProductListReportHandlerService.name);

    constructor(
        private readonly productDatabaseService: ProductDatabaseService,
        private readonly reportDatabaseService: ReportDatabaseService,
        private readonly excelGeneratorService: ExcelGeneratorService
    ) {}

    async handleProductListReport(event: ReportEventDto): Promise<void> {
        this.logger.log(`Processing PRODUCT_LIST report: reportId=${event.reportId}`);

        try {
            const filters = event.filters || {};

            // Determine which statuses to fetch
            const productStatuses = (filters.productStatuses || []).filter(Boolean);
            let statusesToFetch: string[];
            if (productStatuses.length > 0) {
                statusesToFetch = productStatuses;
            } else {
                statusesToFetch = ['ACTIVE'];
            }

            // Fetch product records
            let productRecords = await this.fetchProductRecords(statusesToFetch);

            // Apply optional client-side filters
            productRecords = this.applyOptionalFilters(productRecords, event);

            if (productRecords.length === 0) {
                await this.updateReportStatus(
                    event,
                    ReportStatusEnum.FAILED,
                    undefined,
                    undefined,
                    'No product records found matching the selected filters'
                );
                return;
            }

            // Sort by productName
            productRecords = this.sortByProductName(productRecords);

            // Determine if sub-row columns are needed
            const includeProductDealColumns = productRecords.some((p) => p.productDeals && p.productDeals.length > 0);
            const includeProductUnitPriceColumns = productRecords.some(
                (p) => p.productUnitPrice && p.productUnitPrice.length > 0
            );

            // Build report DTO
            const reportDto = this.buildReportDto(
                event,
                productRecords,
                includeProductDealColumns,
                includeProductUnitPriceColumns
            );

            // Generate Excel
            const fileDetails = await this.excelGeneratorService.generateExcelReport(reportDto);

            // Update status
            await this.updateReportStatus(event, ReportStatusEnum.READY, reportDto.reportFilename, fileDetails);

            this.logger.log(
                `✅ PRODUCT_LIST report generated: reportId=${event.reportId}, records=${productRecords.length}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            this.logger.error(`❌ PRODUCT_LIST report failed: reportId=${event.reportId}`, error);
            await this.updateReportStatus(event, ReportStatusEnum.FAILED, undefined, undefined, errorMessage);
            throw error;
        }
    }

    // ─── Data Fetching ───────────────────────────────────────────────────

    private async fetchProductRecords(statusesToFetch: string[]): Promise<ProductDto[]> {
        const allRecords: ProductDto[] = [];

        for (const status of statusesToFetch) {
            let cursorPointer = '';
            let direction = '';
            const limit = 1000;
            let hasMore = true;

            while (hasMore) {
                const page = await this.productDatabaseService.findRecordsByStatusPagination(
                    limit,
                    status,
                    direction,
                    cursorPointer,
                    ''
                );
                if (page.data && page.data.length > 0) {
                    allRecords.push(...page.data);
                }
                cursorPointer = page.nextCursorPointer ? JSON.stringify(page.nextCursorPointer) : '';
                direction = 'next';
                hasMore = !!page.nextCursorPointer;
            }
        }

        return allRecords;
    }

    // ─── Filtering ───────────────────────────────────────────────────────

    private applyOptionalFilters(records: ProductDto[], event: ReportEventDto): ProductDto[] {
        const filters = event.filters || {};

        // Product Category filter (multi)
        const productCategoryIds = (filters.productCategoryIds || []).filter(Boolean);
        const productCategoryIdSet = productCategoryIds.length > 0 ? new Set(productCategoryIds) : undefined;

        // Product Class filter (multi)
        const productClassIds = (filters.productClassIds || []).filter(Boolean);
        const productClassIdSet = productClassIds.length > 0 ? new Set(productClassIds) : undefined;

        // Product Deal filter (multi) — keep products that have at least one matching deal
        const productDealIds = (filters.productDealIds || []).filter(Boolean);
        const productDealIdSet = productDealIds.length > 0 ? new Set(productDealIds) : undefined;

        // Product Unit filter (multi) — keep products that have at least one matching unit price entry
        const productUnitIds = (filters.productUnitIds || []).filter(Boolean);
        const productUnitIdSet = productUnitIds.length > 0 ? new Set(productUnitIds) : undefined;

        return records.filter((product) => {
            if (productCategoryIdSet && !productCategoryIdSet.has(product.productCategoryId || '')) return false;
            if (productClassIdSet && !productClassIdSet.has(product.productClassId || '')) return false;
            if (productDealIdSet) {
                const deals = product.productDeals || [];
                const hasMatch = deals.some((d) => productDealIdSet.has(d.productDealId || ''));
                if (!hasMatch) return false;
            }
            if (productUnitIdSet) {
                const unitPrices = product.productUnitPrice || [];
                const hasMatch = unitPrices.some((u) => productUnitIdSet.has(u.productUnitId || ''));
                if (!hasMatch) return false;
            }
            return true;
        });
    }

    // ─── Sorting ─────────────────────────────────────────────────────────

    private sortByProductName(records: ProductDto[]): ProductDto[] {
        return [...records].sort((a, b) => {
            const aName = (a.productName || '').toLowerCase();
            const bName = (b.productName || '').toLowerCase();
            return aName.localeCompare(bName);
        });
    }

    // ─── Report Building ─────────────────────────────────────────────────

    private getReportHeaders(includeProductDealColumns: boolean, includeProductUnitPriceColumns: boolean) {
        const base = [
            { description: 'Product Name', metaData: {} },
            { description: 'Category', metaData: {} },
            { description: 'Class', metaData: {} },
            { description: 'Critical Level', metaData: {} },
            { description: 'Status', metaData: {} },
        ];

        if (includeProductDealColumns) {
            base.push(
                { description: 'Deal Name', metaData: {} },
                { description: 'Min Qty', metaData: {} },
                { description: 'Additional Qty', metaData: {} }
            );
        }

        if (includeProductUnitPriceColumns) {
            base.push(
                { description: 'Unit', metaData: {} },
                { description: 'Price Type', metaData: {} },
                { description: 'Cost', metaData: {} },
                { description: 'Price', metaData: {} }
            );
        }

        return base;
    }

    private buildProductRow(
        product: ProductDto,
        includeProductDealColumns: boolean,
        includeProductUnitPriceColumns: boolean
    ): ProductListRow {
        const row: ProductListRow = {
            'Product Name': product.productName || '',
            Category: product.productCategoryName || '',
            Class: product.productClassName || '',
            'Critical Level': product.criticalLevel ?? 0,
            Status: product.status || '',
        };

        if (includeProductDealColumns) {
            row['Deal Name'] = '';
            row['Min Qty'] = '';
            row['Additional Qty'] = '';
        }

        if (includeProductUnitPriceColumns) {
            row['Unit'] = '';
            row['Price Type'] = '';
            row['Cost'] = '';
            row['Price'] = '';
        }

        return row;
    }

    private buildProductDealSubRow(
        deal: { productDealName?: string; minQty?: number; additionalQty?: number },
        includeProductUnitPriceColumns: boolean
    ): ProductListRow {
        const row: ProductListRow = {
            'Product Name': '',
            Category: '',
            Class: '',
            'Critical Level': '',
            Status: '',
            'Deal Name': deal.productDealName || '',
            'Min Qty': deal.minQty ?? 0,
            'Additional Qty': deal.additionalQty ?? 0,
        };

        if (includeProductUnitPriceColumns) {
            row['Unit'] = '';
            row['Price Type'] = '';
            row['Cost'] = '';
            row['Price'] = '';
        }

        return row;
    }

    private buildProductUnitPriceSubRow(
        unitPrice: {
            productUnitName?: string;
            productPriceTypeName?: string;
            cost?: number;
            price?: number;
        },
        includeProductDealColumns: boolean
    ): ProductListRow {
        const row: ProductListRow = {
            'Product Name': '',
            Category: '',
            Class: '',
            'Critical Level': '',
            Status: '',
        };

        if (includeProductDealColumns) {
            row['Deal Name'] = '';
            row['Min Qty'] = '';
            row['Additional Qty'] = '';
        }

        row['Unit'] = unitPrice.productUnitName || '';
        row['Price Type'] = unitPrice.productPriceTypeName || '';
        row['Cost'] = unitPrice.cost ?? 0;
        row['Price'] = unitPrice.price ?? 0;

        return row;
    }

    private buildRows(
        records: ProductDto[],
        includeProductDealColumns: boolean,
        includeProductUnitPriceColumns: boolean
    ): ProductListRow[] {
        const rows: ProductListRow[] = [];

        for (const product of records) {
            rows.push(this.buildProductRow(product, includeProductDealColumns, includeProductUnitPriceColumns));

            // Add product deal sub-rows
            if (includeProductDealColumns) {
                const deals = product.productDeals || [];
                for (const deal of deals) {
                    rows.push(this.buildProductDealSubRow(deal, includeProductUnitPriceColumns));
                }
            }

            // Add product unit price sub-rows
            if (includeProductUnitPriceColumns) {
                const unitPrices = product.productUnitPrice || [];
                for (const unitPrice of unitPrices) {
                    rows.push(this.buildProductUnitPriceSubRow(unitPrice, includeProductDealColumns));
                }
            }
        }

        return rows;
    }

    private buildReportDto(
        event: ReportEventDto,
        records: ProductDto[],
        includeProductDealColumns: boolean,
        includeProductUnitPriceColumns: boolean
    ): ReportDto {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Product List Report';
        reportDto.reportFilename = `${event.reportName || 'Product-List'}.xlsx`;
        reportDto.headers = this.getReportHeaders(includeProductDealColumns, includeProductUnitPriceColumns);
        reportDto.rows = this.buildRows(records, includeProductDealColumns, includeProductUnitPriceColumns);
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
