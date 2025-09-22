import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminRespondToAuthChallengeCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VerifyMFACodeCommand } from './verify.mfa.confirmation.code.command';

/**
 * Handles Multi-Factor Authentication (MFA) code verification for enhanced security authentication.
 *
 * **Business Rules:**
 * - MFA verification required when enabled on user accounts for additional security
 * - Time-based codes (TOTP) expire within configured window (typically 30 seconds)
 * - SMS-based codes expire within configured time period (typically 5 minutes)
 * - Successful MFA verification completes authentication flow and provides JWT tokens
 * - Failed MFA attempts are tracked for security monitoring and potential account lockout
 * - Session tokens required to maintain authentication context during MFA flow
 *
 * **Integration Points:**
 * - AwsCognitoLibService: MFA code validation and authentication completion
 * - ConfigService: MFA configuration and timeout settings
 * - Logging: Comprehensive audit trail for MFA verification activities and security monitoring
 *
 * **Security Considerations:**
 * - MFA codes are cryptographically secure and time-limited
 * - Failed MFA verification attempts logged for security monitoring
 * - Rate limiting applied to prevent brute force MFA code attacks
 * - Session context maintained securely throughout MFA flow
 * - Account lockout policies may apply after repeated failed MFA attempts
 * - Timing attack protection through consistent response times
 *
 * **Error Scenarios:**
 * - Invalid MFA code: Returns 400 with code validation error
 * - Expired MFA code: Returns specific expiration error requiring new code generation
 * - Invalid session: Returns session validation error requiring re-authentication
 * - MFA not enabled: Returns configuration error
 * - AWS Cognito service errors: Logged and wrapped in standard error response format
 *
 * **MFA Types Supported:**
 * - TOTP (Time-based One-Time Password): Authenticator app codes
 * - SMS: Text message verification codes
 * - Email: Email-based verification codes
 * - Hardware tokens: Physical MFA device support
 */
@CommandHandler(VerifyMFACodeCommand)
export class VerifyMFACodeHandler implements ICommandHandler<VerifyMFACodeCommand> {
    protected readonly logger = new Logger(VerifyMFACodeHandler.name);

    constructor(private readonly configService: ConfigService, private readonly cognitoService: AwsCognitoLibService) {}

    async execute(
        command: VerifyMFACodeCommand
    ): Promise<ResponseDto<AdminRespondToAuthChallengeCommandOutput | ErrorResponseDto>> {
        this.logger.log(`MFA verification attempt for user: ${command.email}`);

        try {
            const cognitoResponse = await this.cognitoService.verifyMFACode(
                command.email,
                command.code,
                command.session
            );

            this.logger.log(`MFA verification successful for user: ${command.email}`);
            return new ResponseDto<AdminRespondToAuthChallengeCommandOutput>(cognitoResponse, 200);
        } catch (error) {
            this.logger.error(`MFA verification failed for user ${command.email}: ${error}`);

            let errorMessage = error.message;
            if (error.response?.body?.errorMessage) {
                errorMessage = error.response.body.errorMessage;
            }

            const errorResponseDto: ErrorResponseDto = { errorMessage };
            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
