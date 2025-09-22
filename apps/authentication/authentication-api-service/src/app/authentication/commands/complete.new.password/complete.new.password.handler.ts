import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminRespondToAuthChallengeCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoCompleteNewPasswordDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CompleteNewPasswordCommand } from './complete.new.password.command';

/**
 * Handles completion of new password setup for first-time login and forced password changes.
 *
 * **Business Rules:**
 * - Required for users in FORCE_CHANGE_PASSWORD status (new accounts, admin resets)
 * - New password must meet configured complexity requirements
 * - Session token required to maintain authentication context during password setup
 * - Successful completion activates account and provides full authentication tokens
 * - Failed attempts may require restarting the authentication flow
 * - Password history validation prevents reuse of recent passwords
 *
 * **Integration Points:**
 * - AwsCognitoLibService: Password setup completion and account activation
 * - Session Management: Authentication context maintenance and token generation
 * - Logging: Comprehensive audit trail for password setup activities
 *
 * **Security Considerations:**
 * - Session tokens are time-limited and single-use for password setup
 * - New passwords validated against organizational security policies
 * - Password setup attempts logged for security monitoring
 * - Secure transmission and handling of temporary session data
 * - Account activation occurs only after successful password completion
 *
 * **Error Scenarios:**
 * - Invalid session token: Returns session validation error requiring re-authentication
 * - Password policy violations: Returns detailed policy requirements
 * - Expired session: Returns expiration error requiring new authentication flow
 * - User not in FORCE_CHANGE_PASSWORD state: Returns inappropriate state error
 * - AWS Cognito service errors: Logged and wrapped in standard error response format
 *
 * **Use Cases:**
 * - New employee onboarding: First-time password setup after admin account creation
 * - Password reset completion: Setting new password after forgot password flow
 * - Security policy enforcement: Mandatory password changes for compliance
 * - Account recovery: Password setup as part of account recovery process
 * - Temporary password replacement: Converting temporary passwords to permanent ones
 *
 * **Post-Completion Flow:**
 * - User account status updated to CONFIRMED in Cognito
 * - Full authentication tokens provided for immediate system access
 * - Password setup flag cleared from user profile
 * - Welcome notifications or onboarding processes may be triggered
 */
@CommandHandler(CompleteNewPasswordCommand)
export class CompleteNewPasswordHandler implements ICommandHandler<CompleteNewPasswordCommand> {
    protected readonly logger = new Logger(CompleteNewPasswordHandler.name);

    constructor(private readonly cognitoService: AwsCognitoLibService) {}

    async execute(
        command: CompleteNewPasswordCommand
    ): Promise<ResponseDto<AdminRespondToAuthChallengeCommandOutput | ErrorResponseDto>> {
        this.logger.log(`Password setup completion for user: ${command.email}`);

        try {
            const cognitoDto: CognitoCompleteNewPasswordDto = {
                email: command.email,
                password: command.password,
                session: command.session,
            };

            const cognitoResponse = await this.cognitoService.completeNewPassword(cognitoDto);

            this.logger.log(`Password setup completed successfully for user: ${command.email}`);
            return new ResponseDto<AdminRespondToAuthChallengeCommandOutput>(cognitoResponse, 200);
        } catch (error) {
            this.logger.error(`Password setup failed for user ${command.email}: ${JSON.stringify(error)}`);

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
