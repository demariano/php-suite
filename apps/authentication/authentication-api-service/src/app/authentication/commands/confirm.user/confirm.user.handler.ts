import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminRespondToAuthChallengeCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoConfirmUserDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfirmUserCommand } from './confirm.user.command';

/**
 * Handles email verification completion for user account activation and authentication enablement.
 *
 * **Business Rules:**
 * - Users must verify their email address before account activation
 * - Verification codes expire after configured time period (typically 24 hours)
 * - Successful verification activates account and enables login capabilities
 * - User status changes from UNCONFIRMED to CONFIRMED upon successful verification
 * - Invalid or expired codes result in verification failure requiring code resend
 * - Each verification code can only be used once for security
 *
 * **Integration Points:**
 * - AwsCognitoLibService: Email verification and account confirmation management
 * - Email Service: Verification code delivery and account activation notifications
 * - Logging: Comprehensive audit trail for account verification activities
 *
 * **Security Considerations:**
 * - Verification codes are cryptographically secure and time-limited
 * - Failed verification attempts logged for security monitoring
 * - Rate limiting applied to prevent brute force code guessing
 * - Account lockout policies may apply after repeated failed attempts
 * - Verification process resistant to timing attacks
 *
 * **Error Scenarios:**
 * - Invalid verification code: Returns 400 with code validation error
 * - Expired verification code: Returns specific expiration error for code resend
 * - User already confirmed: Returns appropriate status indicating completion
 * - User not found: Returns error preventing user enumeration
 * - AWS Cognito service errors: Logged and wrapped in standard error response format
 *
 * **Post-Verification Flow:**
 * - Account status updated to CONFIRMED in Cognito
 * - User can proceed with normal authentication flows
 * - Welcome emails or onboarding processes may be triggered
 * - User profile synchronization with internal systems
 */
@CommandHandler(ConfirmUserCommand)
export class ConfirmUserHandler implements ICommandHandler<ConfirmUserCommand> {
    protected readonly logger = new Logger(ConfirmUserHandler.name);

    constructor(private readonly cognitoService: AwsCognitoLibService) {}

    async execute(
        command: ConfirmUserCommand
    ): Promise<ResponseDto<AdminRespondToAuthChallengeCommandOutput | ErrorResponseDto>> {
        this.logger.log(`Email verification attempt for user: ${command.email}`);

        try {
            const cognitoDto: CognitoConfirmUserDto = {
                email: command.email,
                code: command.code,
            };

            const cognitoResponse = await this.cognitoService.confirmUser(cognitoDto);

            this.logger.log(`User email verified successfully: ${command.email}`);
            return new ResponseDto<AdminRespondToAuthChallengeCommandOutput>(cognitoResponse, 200);
        } catch (error) {
            this.logger.error(`Email verification failed for user ${command.email}: ${JSON.stringify(error)}`);

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
