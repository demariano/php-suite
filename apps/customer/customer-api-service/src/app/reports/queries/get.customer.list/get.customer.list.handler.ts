import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, ErrorResponseDto, ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerListReportQuery } from './get.customer.list.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetCustomerListReportQuery)
export class GetCustomerListReportHandler implements IQueryHandler<GetCustomerListReportQuery> {
    protected readonly logger = new Logger(GetCustomerListReportHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(query: GetCustomerListReportQuery): Promise<ResponseDto<CustomerDto[] | ErrorResponseDto>> {
        this.logger.log(`Processing customer list report`);

        try {
            let customers: CustomerDto[] = [];

            if (query.areaId) {
                // Filter by area
                customers = await this.customerDatabaseService.findAllCustomersByAreaId(query.areaId);
            } else {
                // Get all customers via pagination (collect all pages)
                let cursorPointer: string | undefined = undefined;
                const limit = 1000;
                let hasMore = true;

                while (hasMore) {
                    const page = await this.customerDatabaseService.findRecordsByPagination(
                        limit,
                        'next',
                        cursorPointer || ''
                    );
                    customers.push(...page.data);
                    cursorPointer = page.nextCursorPointer ? JSON.stringify(page.nextCursorPointer) : undefined;
                    hasMore = !!page.nextCursorPointer;
                }
            }

            // Filter by status if provided
            if (query.status) {
                customers = customers.filter((c) => c.status === query.status);
            }

            this.logger.log(`Customer list report: ${customers.length} records found`);
            return new ResponseDto<CustomerDto[]>(customers, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error processing customer list report:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            throw new Error(errorMessage);
        }
    }
}
