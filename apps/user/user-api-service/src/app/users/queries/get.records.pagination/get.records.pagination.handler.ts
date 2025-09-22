import { PageDto, ResponseDto, UsersDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { GetRecordsPaginationQuery } from './get.records.pagination.query';

/**
 * Handles paginated user record retrieval for administrative interfaces and user management.
 *
 * **Business Rules:**
 * - Returns users in paginated format for efficient large dataset handling
 * - Uses cursor-based pagination for consistent performance regardless of dataset size
 * - Supports both forward (next) and backward (previous) pagination directions
 * - Default limit applies if not specified to prevent resource exhaustion
 * - Returns all user statuses unless specifically filtered
 *
 * **Performance Considerations:**
 * - Uses cursor-based pagination for O(1) performance regardless of page position
 * - Optimized for large datasets with consistent query performance
 * - Read capacity scales linearly with page size, not total dataset size
 * - Suitable for admin interfaces and reporting dashboards
 * - Minimal memory footprint with streaming results
 *
 * **Integration Points:**
 * - UserDatabaseService: Paginated user data retrieval with cursor management
 * - Admin interfaces: User management dashboards and reporting
 * - Bulk operations: User data export and analysis tools
 * - API consumers: External systems requiring user data synchronization
 *
 * **Pagination Details:**
 * - Cursor-based pagination prevents missing or duplicate records during updates
 * - Direction support: 'next' for forward pagination, 'previous' for backward
 * - Cursor pointer: Opaque token for pagination state management
 * - Configurable page size with reasonable defaults and maximum limits
 */
@QueryHandler(GetRecordsPaginationQuery)
export class GetRecordsPaginationHandler implements IQueryHandler<GetRecordsPaginationQuery> {
    private readonly logger = new Logger(GetRecordsPaginationHandler.name);

    constructor(
        @Inject('UserDatabaseService')
        private readonly userDatabaseService: UserDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsPaginationQuery): Promise<ResponseDto<PageDto<UsersDto>>> {
        this.logger.log(`Executing GetRecordsPaginationHandler with ${JSON.stringify(query)}`);

        const { limit, direction, cursorPointer } = query;

        try {
            const userRecords = await this.userDatabaseService.findUserRecordsPagination(
                limit,
                direction,
                cursorPointer
            );

            this.logger.log(`Retrieved ${userRecords.data.length} user records with pagination`);
            return new ResponseDto<PageDto<UsersDto>>(userRecords, 200);
        } catch (error) {
            this.logger.error(`Error in paginated user retrieval: ${error.message}`);
            throw error;
        }
    }
}
