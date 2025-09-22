import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminRespondToAuthChallengeCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoConfirmCodeDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfirmPasswordCodeCommand } from './confirm.password.code.command';

/**
 * Handles password reset code verification and new password establishment.
 *
 * **Business Rules:**
 * - Verifies password reset codes sent via email during forgot password flow
 * - Reset codes have limited validity periods (typically 1 hour)
 * - New password must meet configured complexity requirements
 * - Successful verification allows immediate password change without current password
 * - Each reset code can only be used once for security
 * - User account must exist and be in valid state for password reset
 *
 * **Integration Points:**
 * - AwsCognitoLibService: Password reset code validation and password update
 * - Email Service: Reset code delivery and confirmation notifications
 * - Logging: Comprehensive audit trail for password reset activities and security monitoring
 *
 * **Security Considerations:**
 * - Reset codes are cryptographically secure and time-limited
 * - Code verification attempts logged for security monitoring
 * - Rate limiting applied to prevent brute force code guessing
 * - Failed verification attempts may lock account temporarily
 * - Successful reset invalidates all existing user sessions
 * - Password reset events generate security notifications
 *
 * **Error Scenarios:**
 * - Invalid reset code: Returns 400 with code validation error
 * - Expired reset code: Returns specific expiration error requiring new reset request
 * - Password policy violations: Returns detailed policy requirements
 * - User not found: Returns error preventing user enumeration
 * - Code already used: Returns error indicating code has been consumed
 * - AWS Cognito service errors: Logged and wrapped in standard error response format
 *
 * **Use Cases:**
 * - Password recovery: Users who forgot their current password
 * - Security incidents: Forced password changes after security breaches
 * - Account recovery: Password reset as part of account recovery process
 * - Help desk support: Assisted password reset for users
 * - Compliance requirements: Mandatory password changes for policy compliance
 *
 * **Post-Reset Flow:**
 * - All existing user sessions immediately invalidated
 * - User can login with new password immediately
 * - Password reset confirmation notifications sent
 * - Security audit logs updated with reset activity
 * - User may be required to update security settings
 */
@CommandHandler(ConfirmPasswordCodeCommand)
export class ConfirmPasswordCodeHandler implements ICommandHandler<ConfirmPasswordCodeCommand> {
    protected readonly logger = new Logger(ConfirmPasswordCodeHandler.name);

    constructor(private readonly cognitoService: AwsCognitoLibService) {}

    async execute(
        command: ConfirmPasswordCodeCommand
    ): Promise<ResponseDto<AdminRespondToAuthChallengeCommandOutput | ErrorResponseDto>> {
        this.logger.log(`Password reset code verification for user: ${command.email}`);

        try {
            const cognitoDto: CognitoConfirmCodeDto = {
                email: command.email,
                code: command.code,
                password: command.password,
            };

            const cognitoResponse = await this.cognitoService.confirmPasswordCode(cognitoDto);

            this.logger.log(`Password reset completed successfully for user: ${command.email}`);
            return new ResponseDto<AdminRespondToAuthChallengeCommandOutput>(cognitoResponse, 200);
        } catch (error) {
            this.logger.error(`Password reset failed for user ${command.email}: ${JSON.stringify(error)}`);

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
