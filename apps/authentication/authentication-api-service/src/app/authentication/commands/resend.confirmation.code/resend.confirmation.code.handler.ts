import { AwsCognitoLibService } from '@aws-cognito-lib';
import { ResendConfirmationCodeCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoEmailDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResendConfirmationCodeCommand } from './resend.confirmation.code.command';

/**
 * Handles resending of email verification confirmation codes for account activation.
 *
 * **Business Rules:**
 * - Resends verification codes to users who have not yet confirmed their email addresses
 * - User account must exist in UNCONFIRMED state for code resend to be valid
 * - Previous verification codes may be invalidated upon resend for security
 * - Rate limiting applied to prevent code spam and potential abuse
 * - Verification codes have limited validity periods (typically 24 hours)
 * - Each user can request limited number of code resends within time window
 *
 * **Integration Points:**
 * - AwsCognitoLibService: Verification code generation and email delivery coordination
 * - Email Service: Verification code email template rendering and delivery
 * - Logging: Comprehensive audit trail for verification activities and user onboarding
 *
 * **Security Considerations:**
 * - Verification codes are cryptographically secure and time-limited
 * - Rate limiting prevents code flooding and potential brute force attacks
 * - Code resend attempts logged for security monitoring and abuse detection
 * - Previous codes invalidated to prevent code accumulation attacks
 * - Audit trail maintained for compliance and security investigations
 *
 * **Error Scenarios:**
 * - User not found: Returns 400 with user identification error
 * - User already confirmed: Returns appropriate status indicating completion
 * - Rate limiting exceeded: Returns rate limit error with retry guidance
 * - Email delivery failure: Logged but may not prevent operation completion
 * - AWS Cognito service errors: Logged and wrapped in standard error response format
 *
 * **Use Cases:**
 * - Email verification recovery: Users who lost or didn't receive original codes
 * - Code expiration: Requesting new codes after previous ones expired
 * - Email delivery issues: Resending codes due to email delivery failures
 * - User support: Customer service assisted verification code requests
 * - Account recovery: Verification as part of account recovery process
 *
 * **Email Content:**
 * - Clear verification code display
 * - Code expiration time and validity period
 * - Instructions for code entry and account activation
 * - Support contact information for assistance
 * - Security warnings about code confidentiality
 */
@CommandHandler(ResendConfirmationCodeCommand)
export class ResendConfirmationCodeHandler implements ICommandHandler<ResendConfirmationCodeCommand> {
    protected readonly logger = new Logger(ResendConfirmationCodeHandler.name);

    constructor(private readonly cognitoService: AwsCognitoLibService) {}

    async execute(
        command: ResendConfirmationCodeCommand
    ): Promise<ResponseDto<ResendConfirmationCodeCommandOutput | ErrorResponseDto>> {
        this.logger.log(`Resending email verification code for user: ${command.email}`);

        try {
            const cognitoDto: CognitoEmailDto = {
                email: command.email,
            };

            const cognitoResponse = await this.cognitoService.resendConfirmationCode(cognitoDto);

            this.logger.log(`Email verification code resent successfully to: ${command.email}`);
            return new ResponseDto<ResendConfirmationCodeCommandOutput>(cognitoResponse, 201);
        } catch (error) {
            this.logger.error(`Failed to resend confirmation code to ${command.email}: ${JSON.stringify(error)}`);

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
