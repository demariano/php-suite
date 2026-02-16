import { AreaDatabaseService, CustomerDatabaseService } from '@customer-database-service';
import {
    AreaDto,
    CustomerDto,
    FileDetailsDto,
    ReportDto,
    ReportEventDto,
    ReportFileDetailDto,
    ReportStatusEnum,
    StatusEnum,
} from '@dto';
import { ExcelGeneratorService } from '@excel-generator-service';
import { Injectable, Logger } from '@nestjs/common';
import { ReportDatabaseService } from '@report-database-service';

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
            // Step 1: Bulk fetch all areas and build a lookup map for fresh area names
            const areaMap = await this.buildAreaLookupMap();

            // Step 2: Fetch customers (by area or all)
            let customers = await this.fetchCustomers(event);

            // Step 3: Filter by active/inactive status
            customers = this.filterByStatus(customers, event);

            // Step 4: Enrich area names with latest values from area map
            customers = this.enrichAreaNames(customers, areaMap);

            // Step 5: Handle empty results
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

            // Step 6: Build and generate report
            const reportDto = this.buildReportDto(event, customers);
            const fileDetails = await this.excelGeneratorService.generateExcelReport(reportDto);

            // Step 7: Update report status to READY
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

    private async fetchCustomers(event: ReportEventDto): Promise<CustomerDto[]> {
        const areaId = event.filters?.areaId;

        if (areaId) {
            this.logger.log(`Fetching customers for areaId=${areaId}`);
            return await this.customerDatabaseService.findAllCustomersByAreaId(areaId);
        }

        // Get all customers via pagination
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

    private filterByStatus(customers: CustomerDto[], event: ReportEventDto): CustomerDto[] {
        const activeStatus = event.filters?.activeStatus;
        const inactiveStatus = event.filters?.inactiveStatus;

        // If both true or both false/undefined, return all (no filter)
        if (activeStatus === inactiveStatus) {
            return customers;
        }

        if (activeStatus) {
            return customers.filter((c) => c.status === StatusEnum.ACTIVE);
        }

        if (inactiveStatus) {
            return customers.filter((c) => c.status === StatusEnum.INACTIVE);
        }

        return customers;
    }

    private enrichAreaNames(customers: CustomerDto[], areaMap: Map<string, string>): CustomerDto[] {
        return customers.map((customer) => {
            if (customer.areaId && areaMap.has(customer.areaId)) {
                customer.areaName = areaMap.get(customer.areaId);
            }
            return customer;
        });
    }

    private buildReportDto(event: ReportEventDto, customers: CustomerDto[]): ReportDto {
        const reportDto = new ReportDto();
        reportDto.reportId = event.reportId;
        reportDto.reportName = event.reportName || 'Customer List';
        reportDto.reportFilename = `${event.reportName || 'Customer-List'}.xlsx`;

        reportDto.headers = [
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

        reportDto.rows = customers.map((customer) => ({
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
        }));

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
