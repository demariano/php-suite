import { ErrorResponseDto, ResponseDto, UsersDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { CreateUserCommand } from './create.user.command';

/**
 * Handles user account creation with comprehensive business rule validation.
 *
 * **Business Rules:**
 * - Email addresses must be unique across all users
 * - New users start with ACTIVE status by default
 * - User roles default to USER unless specified
 * - Email addresses are normalized to lowercase
 *
 * **Integration Points:**
 * - UserDatabaseService: User persistence and email uniqueness validation
 * - Logging: Comprehensive audit trail for user creation activities
 *
 * **Error Scenarios:**
 * - Duplicate email: Returns 400 with specific error message
 * - Database errors: Logged and re-thrown as BadRequestException
 * - Validation failures: Wrapped in standard ResponseDto error format
 */
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
    protected readonly logger = new Logger(CreateUserHandler.name);

    constructor(
        @Inject('UserDatabaseService')
        private readonly userDatabaseService: UserDatabaseServiceAbstract
    ) {}

    async execute(command: CreateUserCommand): Promise<ResponseDto<UsersDto | ErrorResponseDto>> {
        this.logger.log(`Creating user record ${JSON.stringify(command)}`);

        try {
            const existingUserRecord = await this.userDatabaseService.findUserRecordByEmail(command.userDto.email);

            if (existingUserRecord) {
                this.logger.warn(`User creation failed - email already exists: ${command.userDto.email}`);
                throw new BadRequestException(
                    new ResponseDto<ErrorResponseDto>({ errorMessage: 'Email already exists' }, 400)
                );
            }

            const userRecord = await this.userDatabaseService.createRecord(command.userDto);

            this.logger.log(`User created successfully: ${userRecord.userId}`);
            return new ResponseDto<UsersDto>(userRecord, 201);
        } catch (error) {
            this.logger.error(`Error creating user record: ${JSON.stringify(error)}`);

            if (error instanceof BadRequestException) {
                throw error;
            }

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
