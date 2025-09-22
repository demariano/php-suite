import { ErrorResponseDto, ResponseDto, UsersDto } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { HardDeleteUserCommand } from './hard.delete.user.command';

/**
 * Handles permanent user account deletion with complete data removal from the system.
 *
 * **Business Rules:**
 * - Hard delete is PERMANENT and IRREVERSIBLE - user data is completely removed
 * - User must exist in the system before deletion can proceed
 * - Hard delete should only be used for data privacy compliance (GDPR, etc.)
 * - All user data including metadata and preferences are permanently removed
 * - Returns the deleted user data for audit trail purposes before removal
 *
 * **Integration Points:**
 * - UserDatabaseService: User lookup and permanent deletion operations
 * - Logging: Comprehensive audit trail for data deletion compliance
 *
 * **Error Scenarios:**
 * - User not found: Returns 404 NotFoundException with clear message
 * - Database errors: Logged with full context and re-thrown as BadRequestException
 * - Permission errors: Handled by upstream authorization middleware
 *
 * **Data Privacy Compliance:**
 * - Used for GDPR "Right to be Forgotten" requests
 * - Ensures complete data removal from all database indexes (GSI1-GSI6)
 * - Audit logging for compliance reporting
 * - Irreversible operation requiring proper authorization
 */
@CommandHandler(HardDeleteUserCommand)
export class HardDeleteUserHandler implements ICommandHandler<HardDeleteUserCommand> {
    protected readonly logger = new Logger(HardDeleteUserHandler.name);

    constructor(
        @Inject('UserDatabaseService')
        private readonly userDatabaseService: UserDatabaseServiceAbstract
    ) {}

    async execute(command: HardDeleteUserCommand): Promise<ResponseDto<UsersDto>> {
        this.logger.log(`Hard Deleting user record ${JSON.stringify(command)}`);

        try {
            const userRecord = await this.userDatabaseService.findUserRecordById(command.userId);

            if (!userRecord) {
                this.logger.warn(`Hard delete failed - user not found: ${command.userId}`);
                throw new NotFoundException(`User record not found for id ${command.userId}`);
            }

            const userData = await this.userDatabaseService.hardDeleteUserRecord(userRecord);

            this.logger.log(`User permanently deleted: ${command.userId}`);
            return new ResponseDto<UsersDto>(userData, 200);
        } catch (error) {
            this.logger.error(`Error during hard delete user: ${error.message}`);

            if (error instanceof NotFoundException) {
                throw error;
            }

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
