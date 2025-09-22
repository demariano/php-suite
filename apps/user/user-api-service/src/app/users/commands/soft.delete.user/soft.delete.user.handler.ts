import { ErrorResponseDto, ResponseDto, UsersDto } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { SoftDeleteUserCommand } from './soft.delete.user.command';

/**
 * Handles user account soft deletion by marking users as inactive while preserving data.
 *
 * **Business Rules:**
 * - Soft delete is REVERSIBLE - user data is preserved and can be restored
 * - User status is changed to DELETED but record remains in the database
 * - User must exist in the system before soft deletion can proceed
 * - All user data and metadata are preserved for potential recovery
 * - User becomes inaccessible but audit trail and data integrity maintained
 *
 * **Integration Points:**
 * - UserDatabaseService: User lookup and status update operations
 * - Logging: Comprehensive audit trail for user status changes
 *
 * **Error Scenarios:**
 * - User not found: Returns 404 NotFoundException with clear message
 * - Database errors: Logged with full context and re-thrown as BadRequestException
 * - User already soft deleted: Handled gracefully by database service
 *
 * **Use Cases:**
 * - Account deactivation for policy violations
 * - Temporary account suspension
 * - User-requested account deactivation (reversible)
 * - Compliance with data retention policies while maintaining audit trails
 * - Alternative to hard delete when data preservation is required
 */
@CommandHandler(SoftDeleteUserCommand)
export class SoftDeleteUserHandler implements ICommandHandler<SoftDeleteUserCommand> {
    protected readonly logger = new Logger(SoftDeleteUserHandler.name);

    constructor(
        @Inject('UserDatabaseService')
        private readonly userDatabaseService: UserDatabaseServiceAbstract
    ) {}

    async execute(command: SoftDeleteUserCommand): Promise<ResponseDto<UsersDto | ErrorResponseDto>> {
        this.logger.log(`Soft Deleting user record ${JSON.stringify(command)}`);

        try {
            const userRecord = await this.userDatabaseService.findUserRecordById(command.userId);

            if (!userRecord) {
                this.logger.warn(`Soft delete failed - user not found: ${command.userId}`);
                throw new NotFoundException(`User record not found for id ${command.userId}`);
            }

            const userData = await this.userDatabaseService.softDeleteUserRecord(userRecord);

            this.logger.log(`User soft deleted successfully: ${command.userId}`);
            return new ResponseDto<UsersDto>(userData, 200);
        } catch (error) {
            this.logger.error(`Error soft deleting user record ${JSON.stringify(error)}`);

            if (error instanceof NotFoundException) {
                throw error;
            }

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
