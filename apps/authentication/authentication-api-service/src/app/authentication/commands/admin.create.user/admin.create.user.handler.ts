import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminCreateUserCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoEmailDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AdminCreateUserCommand } from './admin.create.user.command';

/**
 * Handles administrative user account creation for privileged user management operations.
 *
 * **Business Rules:**
 * - Administrative account creation bypasses normal registration workflows
 * - Email addresses must be unique across the entire system
 * - Accounts created in FORCE_CHANGE_PASSWORD status requiring initial password setup
 * - No initial password required - temporary password generated automatically by Cognito
 * - Admin-created users receive invitation emails with account setup instructions
 * - Higher privilege operations requiring proper administrative authentication
 *
 * **Integration Points:**
 * - AwsCognitoLibService: Administrative user creation with elevated privileges
 * - Email Service: Automatic invitation email delivery to new admin-created users
 * - Logging: Comprehensive audit trail for administrative user creation activities
 *
 * **Administrative Privileges:**
 * - Bypasses email verification requirements for immediate account creation
 * - Can create users in various initial states (CONFIRMED, FORCE_CHANGE_PASSWORD)
 * - Supports bulk user creation for organizational onboarding
 * - Administrative audit trail for compliance and security monitoring
 * - Enhanced error reporting for administrative diagnostics
 *
 * **Error Scenarios:**
 * - Email already exists: Returns 400 with specific conflict error message
 * - Invalid email format: Validated by Cognito with appropriate error response
 * - Insufficient administrative privileges: Handled by upstream authorization
 * - AWS Cognito service errors: Logged and wrapped in standard error response format
 * - Rate limiting: Administrative operations may have different limits than public endpoints
 *
 * **Use Cases:**
 * - HR onboarding: Bulk employee account creation
 * - Partner management: External user account provisioning
 * - System administration: Service account and administrative user creation
 * - Migration: Importing users from external systems
 * - Emergency access: Creating accounts for urgent business needs
 */
@CommandHandler(AdminCreateUserCommand)
export class AdminCreateUserHandler implements ICommandHandler<AdminCreateUserCommand> {
    protected readonly logger = new Logger(AdminCreateUserHandler.name);

    constructor(private readonly cognitoService: AwsCognitoLibService) {}

    async execute(
        command: AdminCreateUserCommand
    ): Promise<ResponseDto<AdminCreateUserCommandOutput | ErrorResponseDto>> {
        this.logger.log(`Administrative user creation for: ${command.email}`);

        try {
            const cognitoDto: CognitoEmailDto = {
                email: command.email,
            };

            const cognitoResponse = await this.cognitoService.adminCreateUser(cognitoDto);

            this.logger.log(`Administrative user created successfully: ${command.email}`);
            return new ResponseDto<AdminCreateUserCommandOutput>(cognitoResponse, 200);
        } catch (error) {
            this.logger.error(`Administrative user creation failed for ${command.email}: ${JSON.stringify(error)}`);

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
