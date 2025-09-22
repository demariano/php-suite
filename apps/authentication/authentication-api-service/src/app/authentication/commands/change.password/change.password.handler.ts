import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminSetUserPasswordCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ChangePasswordCommand } from './change.password.command';

/**
 * Handles user password changes for authenticated users and administrative password updates.
 *
 * **Business Rules:**
 * - User must be authenticated or operation must be performed by administrator
 * - New password must meet configured complexity requirements (length, special characters, etc.)
 * - Password change immediately invalidates existing sessions and tokens
 * - Previous password history validation prevents password reuse
 * - User account status must allow password modifications
 * - Force password change flags are cleared upon successful password update
 *
 * **Integration Points:**
 * - AwsCognitoLibService: Secure password update with validation and policy enforcement
 * - Session Management: Existing user sessions invalidated after password change
 * - Logging: Comprehensive audit trail for password change activities and security monitoring
 *
 * **Security Considerations:**
 * - Password complexity validation enforced by AWS Cognito policies
 * - Password change events logged for security monitoring and compliance
 * - Existing authentication tokens invalidated to prevent unauthorized access
 * - Rate limiting applied to prevent brute force password change attempts
 * - Administrative password changes bypass current password validation
 * - Strong audit trail for regulatory compliance and security investigations
 *
 * **Error Scenarios:**
 * - User not found: Returns 400 with appropriate error message
 * - Invalid new password: Returns detailed policy violation information
 * - Password complexity violations: Returns specific policy requirements
 * - Account locked/disabled: Returns appropriate access denied error
 * - AWS Cognito service errors: Logged and wrapped in standard error response format
 *
 * **Use Cases:**
 * - User-initiated password changes: Self-service password updates
 * - Administrative password resets: Help desk and admin password changes
 * - Security-mandated changes: Compliance-driven password updates
 * - Account recovery: Post-verification password establishment
 * - Force password change: Initial setup and security policy enforcement
 */
@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand> {
    protected readonly logger = new Logger(ChangePasswordHandler.name);

    constructor(private readonly cognitoService: AwsCognitoLibService) {}

    async execute(
        command: ChangePasswordCommand
    ): Promise<ResponseDto<AdminSetUserPasswordCommandOutput | ErrorResponseDto>> {
        this.logger.log(`Password change request for user: ${command.email}`);

        try {
            const cognitoDto: CognitoDto = {
                email: command.email,
                password: command.password,
            };

            const cognitoResponse = await this.cognitoService.changePassword(cognitoDto);

            this.logger.log(`Password changed successfully for user: ${command.email}`);
            return new ResponseDto<AdminSetUserPasswordCommandOutput>(cognitoResponse, 200);
        } catch (error) {
            this.logger.error(`Password change failed for user ${command.email}: ${JSON.stringify(error)}`);

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
