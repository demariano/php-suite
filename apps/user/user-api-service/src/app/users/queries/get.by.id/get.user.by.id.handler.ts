import { ResponseDto, UsersDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { GetUserByIdQuery } from './get.user.by.id.query';

/**
 * Handles user record retrieval by unique user identifier for profile access and administration.
 *
 * **Business Rules:**
 * - Returns complete user profile including all metadata and preferences
 * - Only returns users that exist in the system (no soft-deleted users unless specified)
 * - User ID must be valid and properly formatted
 * - Provides full user details for authenticated access
 *
 * **Performance Considerations:**
 * - Uses primary key lookup for optimal O(1) performance
 * - Single database query with no additional joins or filtering
 * - Suitable for high-frequency profile access operations
 * - Minimal read capacity consumption (~0.5 RCU per query)
 *
 * **Integration Points:**
 * - UserDatabaseService: Primary user data source for ID-based lookups
 * - Authentication flows: Profile retrieval after login
 * - Admin panels: User management and detailed user information
 * - User profile pages: Complete user data display
 *
 * **Error Scenarios:**
 * - User not found: Returns 404 NotFoundException with clear message
 * - Invalid user ID format: Handled by database service with appropriate error
 * - Database errors: Logged and re-thrown as NotFoundException
 */
@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
    private readonly logger = new Logger(GetUserByIdHandler.name);

    constructor(
        @Inject('UserDatabaseService')
        private readonly userDatabaseService: UserDatabaseServiceAbstract
    ) {}

    async execute(query: GetUserByIdQuery): Promise<ResponseDto<UsersDto>> {
        this.logger.log(`Executing GetUserByIdHandler with userId: ${query.userId}`);

        const { userId } = query;

        try {
            const userRecord = await this.userDatabaseService.findUserRecordById(userId);

            if (!userRecord) {
                this.logger.warn(`User not found for ID: ${userId}`);
                throw new NotFoundException(`User not found for ID: ${userId}`);
            }

            return new ResponseDto<UsersDto>(userRecord, 200);
        } catch (error) {
            this.logger.error(`Error fetching user by ID: ${error.message}`);

            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new NotFoundException(`User not found for ID: ${userId}`);
        }
    }
}
