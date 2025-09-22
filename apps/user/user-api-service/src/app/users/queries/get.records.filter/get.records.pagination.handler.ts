import { PageDto, ResponseDto, UsersDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { GetRecordsFilterQuery } from './get.records.pagination.query';

/**
 * Handles filtered and paginated user record retrieval for targeted administrative queries.
 *
 * **Business Rules:**
 * - Combines filtering capabilities with efficient pagination for targeted user searches
 * - Supports multiple filter criteria (status, role, date ranges, custom metadata)
 * - Uses cursor-based pagination for consistent performance on filtered datasets
 * - Applies business logic filters while maintaining data access permissions
 * - Returns only users matching all specified filter criteria
 *
 * **Performance Considerations:**
 * - Uses appropriate GSI indexes based on filter criteria for optimal query performance
 * - Cursor-based pagination maintains performance regardless of result set size
 * - Filter-first approach minimizes data transfer and processing overhead
 * - Suitable for admin dashboards requiring specific user segments
 * - Query performance depends on filter selectivity and index utilization
 *
 * **Integration Points:**
 * - UserDatabaseService: Filtered user data retrieval with advanced query capabilities
 * - Admin interfaces: Targeted user management and reporting dashboards
 * - Compliance reporting: User segmentation for audit and regulatory requirements
 * - Analytics systems: User cohort analysis and behavioral reporting
 *
 * **Filter Capabilities:**
 * - User status filtering (ACTIVE, INACTIVE, DELETED, PENDING)
 * - Role-based filtering (USER, ADMIN, custom roles)
 * - Date range filtering (creation date, last activity, modification date)
 * - Metadata and custom field filtering
 * - Combined filter logic with AND/OR operations
 *
 * **Error Scenarios:**
 * - Invalid filter criteria: Validated by database service with clear error messages
 * - Database errors: Logged and propagated with context
 * - No results found: Returns empty page with appropriate pagination metadata
 */
@QueryHandler(GetRecordsFilterQuery)
export class GetRecordsFilterHandler implements IQueryHandler<GetRecordsFilterQuery> {
    private readonly logger = new Logger(GetRecordsFilterHandler.name);

    constructor(
        @Inject('UserDatabaseService')
        private readonly userDatabaseService: UserDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsFilterQuery): Promise<ResponseDto<PageDto<UsersDto>>> {
        this.logger.log(`Executing GetRecordsFilterHandler with ${JSON.stringify(query)}`);

        const { limit, direction, cursorPointer, filter } = query;

        try {
            const userRecords = await this.userDatabaseService.findUserRecordsByFilterPagination(
                filter,
                limit,
                direction,
                cursorPointer
            );

            this.logger.log(`Retrieved ${userRecords.data.length} filtered user records with pagination`);
            return new ResponseDto<PageDto<UsersDto>>(userRecords, 200);
        } catch (error) {
            this.logger.error(`Error in filtered user retrieval: ${error.message}`);
            throw error;
        }
    }
}
