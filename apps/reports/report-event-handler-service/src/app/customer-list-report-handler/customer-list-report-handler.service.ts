import { AreaDatabaseService, CustomerDatabaseService } from '@customer-database-service';
import {
    AreaDto,
    CustomerDto,
    CustomerProductDealDto,
    FileDetailsDto,
    ReportDto,
    ReportEventDto,
    ReportFileDetailDto,
    ReportStatusEnum,
} from '@dto';
import { ExcelGeneratorService } from '@excel-generator-service';
import { Injectable, Logger } from '@nestjs/common';
import { ReportDatabaseService } from '@report-database-service';

type CustomerListRow = Record<string, string | number>;

@Injectable()
export class CustomerListReportHandlerService {
    private readonly logger = new Logger(CustomerListReportHandlerService.name);

    constructor(
        private readonly customerDatabaseService: CustomerDatabaseService,
        private readonly areaDatabaseService: AreaDatabaseService,
        private readonly reportDatabaseService: ReportDatabaseService,
        private readonly excelGeneratorService: ExcelGeneratorService
    ) {}

    async handleCustomerListReport(event: ReportEventDto): Promise<void> {
        this.logger.log(`Processing CUSTOMER_LIST report: reportId=${event.reportId}`);

        try {
            // Step 1: Build area lookup map for fresh area names
            const areaMap = await this.buildAreaLookupMap();

            // Step 2: Fetch all customers via pagination
            let customers = await this.fetchAllCustomers();

            // Step 3: Apply multi-filters
            customers = this.applyFilters(customers, event);

            // Step 4: Enrich area names from lookup map
            customers = this.enrichAreaNames(customers, areaMap);

            // Step 5: Sort alphabetically by customer name
            customers = this.sortCustomersByName(customers);

            // Step 6: Handle empty results
            if (customers.length === 0) {
                this.logger.warn(`No customers found for CUSTOMER_LIST report: reportId=${event.reportId}`);
                await this.updateReportStatus(
                    event,
                    ReportStatusEnum.FAILED,
                    undefined,
                    undefined,
                    'No customers found matching the selected filters'
                );
                return;
            }

            // Determine if product deal sub-rows should be included
            const productDealIds = (event.filters?.productDealIds || []).filter(Boolean);
            const productDealIdSet = productDealIds.length > 0 ? new Set(productDealIds) : undefined;
            const includeProductDealDetails = !!event.filters?.includeProductDealDetails;
            const includeProductDealColumns = !includeProductDealDetails && !!productDealIdSet;

            // Step 7: Build report (with separate-by-area branching)
            const separateByArea = !!event.filters?.separateByArea;
            const opts = { includeProductDealColumns, includeProductDealDetails, productDealIdSet };
            const reportDto = separateByArea
                ? this.buildAreaWorkbookReportDto(event, customers, opts)
                : this.buildReportDto(event, customers, opts);

            // Step 8: Generate Excel
            const fileDetails = await this.excelGeneratorService.generateExcelReport(reportDto);

            // Step 9: Update report status to READY
            await this.updateReportStatus(event, ReportStatusEnum.READY, reportDto.reportFilename, fileDetails);

            this.logger.log(
                `✅ CUSTOMER_LIST report generated: reportId=${event.reportId}, records=${customers.length}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            this.logger.error(`❌ CUSTOMER_LIST report failed: reportId=${event.reportId}`, error);
            await this.updateReportStatus(event, ReportStatusEnum.FAILED, undefined, undefined, errorMessage);
            throw error;
        }
    }

    // ─── Data Fetching ───────────────────────────────────────────────────

    private async buildAreaLookupMap(): Promise<Map<string, string>> {
        const areaMap = new Map<string, string>();
        let cursorPointer: string | undefined = undefined;
        let direction = '';
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const page = await this.areaDatabaseService.findRecordsByPagination(limit, direction, cursorPointer || '');
            page.data.forEach((area: AreaDto) => {
                if (area.areaId && area.areaName) {
                    areaMap.set(area.areaId, area.areaName);
                }
            });
            cursorPointer = page.nextCursorPointer ? JSON.stringify(page.nextCursorPointer) : undefined;
            direction = 'next';
            hasMore = !!page.nextCursorPointer;
        }

        this.logger.log(`Area lookup map built with ${areaMap.size} entries`);
        return areaMap;
    }

    private async fetchAllCustomers(): Promise<CustomerDto[]> {
        this.logger.log(`Fetching all customers via pagination`);
        const customers: CustomerDto[] = [];
        let cursorPointer: string | undefined = undefined;
        let direction = '';
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const page = await this.customerDatabaseService.findRecordsByPagination(
                limit,
                direction,
                cursorPointer || ''
            );
            customers.push(...page.data);
            cursorPointer = page.nextCursorPointer ? JSON.stringify(page.nextCursorPointer) : undefined;
            direction = 'next';
            hasMore = !!page.nextCursorPointer;
        }

        return customers;
    }

    // ─── Filtering ───────────────────────────────────────────────────────

    private applyFilters(customers: CustomerDto[], event: ReportEventDto): CustomerDto[] {
        const filters = event.filters || {};

        // Area filter (multi)
        const areaIds = (filters.areaIds || []).filter(Boolean);
        const areaIdSet = areaIds.length > 0 ? new Set(areaIds) : undefined;

        // Town filter (multi)
        const townNames = (filters.townNames || []).filter(Boolean);
        const townNameSet = townNames.length > 0 ? new Set(townNames) : undefined;

        // Classification filter (multi)
        const classificationIds = (filters.customerClassificationIds || []).filter(Boolean);
        const classificationIdSet = classificationIds.length > 0 ? new Set(classificationIds) : undefined;

        // Type filter (multi)
        const typeIds = (filters.customerTypeIds || []).filter(Boolean);
        const typeIdSet = typeIds.length > 0 ? new Set(typeIds) : undefined;

        // Product Deal filter (multi) — match if customer has any matching productDealId in their customerProductDeals array
        const productDealIds = (filters.productDealIds || []).filter(Boolean);
        const productDealIdSet = productDealIds.length > 0 ? new Set(productDealIds) : undefined;

        // Customer status filter (multi)
        const customerStatuses = (filters.customerStatuses || []).filter(Boolean);
        const statusSet = customerStatuses.length > 0 ? new Set(customerStatuses) : undefined;

        return customers.filter((customer) => {
            // Area filter
            if (areaIdSet && !areaIdSet.has(customer.areaId || '')) return false;

            // Town filter
            if (townNameSet && !townNameSet.has(customer.townName || '')) return false;

            // Classification filter
            if (classificationIdSet && !classificationIdSet.has(customer.customerClassificationId || '')) return false;

            // Type filter
            if (typeIdSet && !typeIdSet.has(customer.customerTypeId || '')) return false;

            // Product Deal filter — customer must have at least one matching deal
            if (productDealIdSet) {
                const deals = customer.customerProductDeals || [];
                const hasMatch = deals.some((deal: { productDealId?: string }) =>
                    productDealIdSet.has(deal.productDealId || '')
                );
                if (!hasMatch) return false;
            }

            // Status filter
            if (statusSet && !statusSet.has(customer.status || '')) return false;

            return true;
        });
    }

    // ─── Sorting ─────────────────────────────────────────────────────────

    private sortCustomersByName(customers: CustomerDto[]): CustomerDto[] {
        return [...customers].sort((a, b) => {
            const aName = (a.customerName || '').toLowerCase();
            const bName = (b.customerName || '').toLowerCase();
            return aName.localeCompare(bName);
        });
    }

    // ─── Enrichment ──────────────────────────────────────────────────────

    private enrichAreaNames(customers: CustomerDto[], areaMap: Map<string, string>): CustomerDto[] {
        return customers.map((customer) => {
            if (customer.areaId && areaMap.has(customer.areaId)) {
                customer.areaName = areaMap.get(customer.areaId);
            }
            return customer;
        });
    }

    // ─── Report Building ─────────────────────────────────────────────────

    private getReportHeaders(includeProductDealColumns: boolean) {
        const base = [
            { description: 'Customer Name', metaData: {} },
            { description: 'Contact No', metaData: {} },
            { description: 'Contact Person', metaData: {} },
            { description: 'Area', metaData: {} },
            { description: 'Town', metaData: {} },
            { description: 'Classification', metaData: {} },
            { description: 'Type', metaData: {} },
            { description: 'Balance', metaData: {} },
            { description: 'Credit Limit', metaData: {} },
            { description: 'Status', metaData: {} },
        ];

        if (!includeProductDealColumns) return base;

        return [
            ...base,
            { description: 'Product Deal', metaData: {} },
            { description: 'Product', metaData: {} },
            { description: 'Min Qty', metaData: {} },
            { description: 'Additional Qty', metaData: {} },
            { description: 'Deal Status', metaData: {} },
        ];
    }

    private buildCustomerRow(customer: CustomerDto, includeProductDealColumns: boolean): CustomerListRow {
        const row: CustomerListRow = {
            'Customer Name': customer.customerName || '',
            'Contact No': customer.contactNo || '',
            'Contact Person': customer.contactPerson || '',
            Area: customer.areaName || '',
            Town: customer.townName || '',
            Classification: customer.customerClassificationName || '',
            Type: customer.customerTypeName || '',
            Balance: customer.balance ?? 0,
            'Credit Limit': customer.creditLimit ?? 0,
            Status: customer.status || '',
        };

        if (includeProductDealColumns) {
            row['Product Deal'] = '';
            row['Product'] = '';
            row['Min Qty'] = '';
            row['Additional Qty'] = '';
            row['Deal Status'] = '';
        }

        return row;
    }

    private buildProductDealSubHeaderRow(): CustomerListRow {
        return {
            'Customer Name': '',
            'Contact No': 'Product Deal',
            'Contact Person': 'Product',
            Area: 'Min Qty',
            Town: 'Additional Qty',
            Classification: 'Deal Status',
            Type: '',
            Balance: '',
            'Credit Limit': '',
            Status: '',
            __subHeader: true,
        } as unknown as CustomerListRow;
    }

    private buildProductDealSubRow(deal: CustomerProductDealDto): CustomerListRow {
        return {
            'Customer Name': '',
            'Contact No': deal.productDealName || deal.productDealId || '',
            'Contact Person': deal.productName || deal.productId || '',
            Area: deal.minQty ?? 0,
            Town: deal.additionalQty ?? 0,
            Classification: deal.status || '',
            Type: '',
            Balance: '',
            'Credit Limit': '',
            Status: '',
        };
    }

    private buildRows(
        customers: CustomerDto[],
        opts: { includeProductDealColumns: boolean; includeProductDealDetails: boolean; productDealIdSet?: Set<string> }
    ): CustomerListRow[] {
        const rows: CustomerListRow[] = [];

        for (const customer of customers) {
            rows.push(this.buildCustomerRow(customer, opts.includeProductDealColumns));

            if (!opts.includeProductDealDetails) continue;

            const deals: CustomerProductDealDto[] = customer.customerProductDeals || [];
            const filteredDeals = opts.productDealIdSet
                ? deals.filter((deal) => opts.productDealIdSet!.has(deal.productDealId || ''))
                : deals;

            if (filteredDeals.length > 0) {
                rows.push(this.buildProductDealSubHeaderRow());
                for (const deal of filteredDeals) {
                    rows.push(this.buildProductDealSubRow(deal));
                }
            }
        }

        return rows;
    }

    private buildReportDto(
        event: ReportEventDto,
        customers: CustomerDto[],
        opts: { includeProductDealColumns: boolean; includeProductDealDetails: boolean; productDealIdSet?: Set<string> }
    ): ReportDto {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Customer List';
        reportDto.reportFilename = `${event.reportName || 'Customer-List'}.xlsx`;

        reportDto.headers = this.getReportHeaders(opts.includeProductDealColumns);
        reportDto.rows = this.buildRows(customers, opts);

        return reportDto;
    }

    private buildAreaWorkbookReportDto(
        event: ReportEventDto,
        customers: CustomerDto[],
        opts: { includeProductDealColumns: boolean; includeProductDealDetails: boolean; productDealIdSet?: Set<string> }
    ): ReportDto {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Customer List';
        reportDto.reportFilename = `${event.reportName || 'Customer-List'}.xlsx`;

        const headers = this.getReportHeaders(opts.includeProductDealColumns);

        // Group customers by area
        const grouped = new Map<string, CustomerDto[]>();
        for (const customer of customers) {
            const key = customer.areaId || 'UNASSIGNED';
            const list = grouped.get(key) || [];
            list.push(customer);
            grouped.set(key, list);
        }

        const used = new Set<string>();
        const sheets = Array.from(grouped.values()).map((areaCustomers) => {
            const sorted = this.sortCustomersByName(areaCustomers);
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
