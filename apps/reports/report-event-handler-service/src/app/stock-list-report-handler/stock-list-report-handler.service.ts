import { FileDetailsDto, ReportDto, ReportEventDto, ReportFileDetailDto, ReportStatusEnum, StockDto } from '@dto';
import { ExcelGeneratorService } from '@excel-generator-service';
import { StockDatabaseService } from '@inventory-database-service';
import { Injectable, Logger } from '@nestjs/common';
import { ReportDatabaseService } from '@report-database-service';

type StockListRow = Record<string, string | number>;

@Injectable()
export class StockListReportHandlerService {
    private readonly logger = new Logger(StockListReportHandlerService.name);

    constructor(
        private readonly stockDatabaseService: StockDatabaseService,
        private readonly reportDatabaseService: ReportDatabaseService,
        private readonly excelGeneratorService: ExcelGeneratorService
    ) {}

    async handleStockListReport(event: ReportEventDto): Promise<void> {
        this.logger.log(`Processing STOCK_LIST report: reportId=${event.reportId}`);

        try {
            // Determine which statuses to fetch
            const filters = event.filters || {};
            const stockStatuses = (filters.stockStatuses || []).filter(Boolean);
            let statusesToFetch: string[];
            if (stockStatuses.length > 0) {
                statusesToFetch = stockStatuses;
            } else {
                // Legacy fallback: activeStatus / inactiveStatus booleans
                statusesToFetch = [];
                if (filters.activeStatus !== false) statusesToFetch.push('ACTIVE');
                if (filters.inactiveStatus === true) statusesToFetch.push('INACTIVE');
                if (statusesToFetch.length === 0) statusesToFetch.push('ACTIVE');
            }

            // Fetch stock records
            let stockRecords = await this.fetchStockRecords(statusesToFetch);

            // Apply optional client-side filters
            stockRecords = this.applyOptionalFilters(stockRecords, event);

            if (stockRecords.length === 0) {
                await this.updateReportStatus(
                    event,
                    ReportStatusEnum.FAILED,
                    undefined,
                    undefined,
                    'No stock records found matching the selected filters'
                );
                return;
            }

            // Sort by productName
            stockRecords = this.sortByProductName(stockRecords);

            // Build report DTO
            const reportDto = this.buildReportDto(event, stockRecords);

            // Generate Excel
            const fileDetails = await this.excelGeneratorService.generateExcelReport(reportDto);

            // Update status
            await this.updateReportStatus(event, ReportStatusEnum.READY, reportDto.reportFilename, fileDetails);

            this.logger.log(
                `✅ STOCK_LIST report generated: reportId=${event.reportId}, records=${stockRecords.length}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            this.logger.error(`❌ STOCK_LIST report failed: reportId=${event.reportId}`, error);
            await this.updateReportStatus(event, ReportStatusEnum.FAILED, undefined, undefined, errorMessage);
            throw error;
        }
    }

    // ─── Data Fetching ───────────────────────────────────────────────────

    private async fetchStockRecords(statusesToFetch: string[]): Promise<StockDto[]> {
        const allRecords: StockDto[] = [];

        for (const status of statusesToFetch) {
            let cursorPointer = '';
            let direction = '';
            const limit = 1000;
            let hasMore = true;

            while (hasMore) {
                const page = await this.stockDatabaseService.findRecordsPagination(
                    limit,
                    status,
                    direction,
                    cursorPointer
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

    private applyOptionalFilters(records: StockDto[], event: ReportEventDto): StockDto[] {
        const filters = event.filters || {};

        // Stock Type filter (multi)
        const stockTypeIds = (filters.stockTypeIds || []).filter(Boolean);
        const stockTypeIdSet = stockTypeIds.length > 0 ? new Set(stockTypeIds) : undefined;

        // Product Unit filter (multi)
        const productUnitIds = (filters.productUnitIds || []).filter(Boolean);
        const productUnitIdSet = productUnitIds.length > 0 ? new Set(productUnitIds) : undefined;

        // Product filter (multi — from productSelections)
        const productSelections = filters.productSelections || [];
        const productIdSet =
            productSelections.length > 0
                ? new Set(productSelections.map((p) => p.productId).filter(Boolean))
                : undefined;

        // Lot No filter (comma-separated → array)
        const lotNos = (filters.lotNos || []).filter(Boolean);
        const lotNoSet = lotNos.length > 0 ? new Set(lotNos.map((l) => l.trim())) : undefined;

        // Expiration date range filter (optional)
        const expirationStartDate = filters.startDate;
        const expirationEndDate = filters.endDate;
        const hasExpirationDateFilter = !!expirationStartDate && !!expirationEndDate;

        return records.filter((stock) => {
            if (stockTypeIdSet && !stockTypeIdSet.has(stock.stockTypeId || '')) return false;
            if (productUnitIdSet && !productUnitIdSet.has(stock.productUnitId || '')) return false;
            if (productIdSet && !productIdSet.has(stock.productId || '')) return false;
            if (lotNoSet && !lotNoSet.has((stock.lotNo || '').trim())) return false;

            if (hasExpirationDateFilter) {
                const expDate = stock.expirationDate;
                if (!expDate) return false; // No expiration date — exclude when filter is active
                if (expDate < expirationStartDate || expDate > expirationEndDate) return false;
            }

            return true;
        });
    }

    // ─── Sorting ─────────────────────────────────────────────────────────

    private sortByProductName(records: StockDto[]): StockDto[] {
        return [...records].sort((a, b) => {
            const aName = (a.productName || '').toLowerCase();
            const bName = (b.productName || '').toLowerCase();
            return aName.localeCompare(bName);
        });
    }

    // ─── Report Building ─────────────────────────────────────────────────

    private buildHeaders() {
        return [
            { description: 'Product Name', metaData: {} },
            { description: 'Product Unit', metaData: {} },
            { description: 'Stock Type', metaData: {} },
            { description: 'Lot No', metaData: {} },
            { description: 'Total Quantity', metaData: {} },
            { description: 'Expiration Date', metaData: {} },
            { description: 'Status', metaData: {} },
        ];
    }

    private buildRows(records: StockDto[]): StockListRow[] {
        return records.map((stock) => ({
            'Product Name': stock.productName || '',
            'Product Unit': stock.productUnitName || '',
            'Stock Type': stock.stockTypeName || '',
            'Lot No': stock.lotNo || '',
            'Total Quantity': stock.totalQuantity ?? 0,
            'Expiration Date': stock.expirationDate || '',
            Status: stock.status || '',
        }));
    }

    private buildReportDto(event: ReportEventDto, records: StockDto[]): ReportDto {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Stock List Report';
        reportDto.reportFilename = `${event.reportName || 'Stock-List'}.xlsx`;
        reportDto.headers = this.buildHeaders();
        reportDto.rows = this.buildRows(records);
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
