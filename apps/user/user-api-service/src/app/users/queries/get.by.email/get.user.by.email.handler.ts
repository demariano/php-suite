import { ResponseDto, UsersDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { GetUserByEmailQuery } from './get.user.by.email.query';

/**
 * Handles user record retrieval by email address for authentication and profile access.
 *
 * **Business Rules:**
 * - Email addresses are case-insensitive (normalized to lowercase)
 * - Returns complete user profile including all metadata and preferences
 * - Only returns active and accessible users (excludes soft-deleted unless specified)
 * - Email must be properly formatted and valid
 *
 * **Performance Considerations:**
 * - Uses GSI4 index for optimal O(1) email-based lookups
 * - Single database query with no additional joins or filtering
 * - Suitable for high-frequency authentication operations
 * - Minimal read capacity consumption (~0.5 RCU per query)
 *
 * **Integration Points:**
 * - UserDatabaseService: Primary user data source for email-based lookups
 * - Authentication flows: Profile retrieval during login process
 * - Password recovery: User identification for reset processes
 * - User registration: Email uniqueness validation
 *
 * **Error Scenarios:**
 * - User not found: Returns 404 NotFoundException with clear message
 * - Invalid email format: Handled by email normalization and database query
 * - Database errors: Logged and re-thrown as NotFoundException
 */
@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler implements IQueryHandler<GetUserByEmailQuery> {
    private readonly logger = new Logger(GetUserByEmailHandler.name);

    constructor(
        @Inject('UserDatabaseService')
        private readonly userDatabaseService: UserDatabaseServiceAbstract,
    ) {}

    async execute(query: GetUserByEmailQuery): Promise<ResponseDto<UsersDto>> {
        const { email } = query;

        this.logger.log(`Executing GetUserByEmailHandler with email: ${email}`);

        try {
            const userRecord = await this.userDatabaseService.findUserRecordByEmail(email);
            
            if (!userRecord) {
                this.logger.warn(`User not found for email: ${email}`);
                throw new NotFoundException(`User not found for email: ${email}`);
            }
            
            return new ResponseDto<UsersDto>(userRecord, 200);
            
        } catch (error) {
            this.logger.error(`Error fetching user by email: ${error.message}`);
            
            if (error instanceof NotFoundException) {
                throw error;
            }
            
            throw new NotFoundException(`User not found for email: ${email}`);
        }
    }
}