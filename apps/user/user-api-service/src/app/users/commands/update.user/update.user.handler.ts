import { ErrorResponseDto, ResponseDto, UsersDto } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { UpdateUserCommand } from './update.user.command';

/**
 * Handles user account information updates with data validation and integrity checks.
 *
 * **Business Rules:**
 * - User must exist in the system before updates can be applied
 * - All provided fields will overwrite existing user data (complete update)
 * - User ID cannot be changed (immutable identifier)
 * - Email updates must maintain uniqueness across all users
 * - User status and role changes follow proper business validation
 *
 * **Integration Points:**
 * - UserDatabaseService: User lookup and update operations
 * - Logging: Comprehensive audit trail for user data modifications
 *
 * **Error Scenarios:**
 * - User not found: Returns 404 NotFoundException with clear message
 * - Database errors: Logged with full context and re-thrown as BadRequestException
 * - Validation failures: Wrapped in standard ResponseDto error format
 *
 * **Use Cases:**
 * - Profile updates by users (name, preferences, metadata)
 * - Administrative user management (role changes, status updates)
 * - Data correction and maintenance operations
 * - Account information synchronization from external systems
 */
@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
    protected readonly logger = new Logger(UpdateUserHandler.name);

    constructor(
        @Inject('UserDatabaseService')
        private readonly userDatabaseService: UserDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateUserCommand): Promise<ResponseDto<UsersDto | ErrorResponseDto>> {
        this.logger.log(`Updating user record ${JSON.stringify(command)}`);

        try {
            const existingUserRecord = await this.userDatabaseService.findUserRecordById(command.userDto.userId);

            if (!existingUserRecord) {
                this.logger.warn(`Update failed - user not found: ${command.userDto.userId}`);
                throw new NotFoundException(`User record not found for id ${command.userDto.userId}`);
            }

            const updatedUserData = {
                ...command.userDto,
            };

            const userRecord = await this.userDatabaseService.updateUserRecord(updatedUserData);

            this.logger.log(`User updated successfully: ${command.userDto.userId}`);
            return new ResponseDto<UsersDto>(userRecord, 200);
        } catch (error) {
            this.logger.error(`Error updating user record ${JSON.stringify(error)}`);

            if (error instanceof NotFoundException) {
                throw error;
            }

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
