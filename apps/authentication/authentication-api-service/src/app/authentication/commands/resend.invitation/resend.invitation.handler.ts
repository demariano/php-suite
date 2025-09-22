import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminCreateUserCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoEmailDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResendInvitationCommand } from './resend.invitation.command';

/**
 * Handles resending of account invitation emails for user onboarding and account activation.
 *
 * **Business Rules:**
 * - Resends invitation emails to users who have not yet activated their accounts
 * - User account must exist in FORCE_CHANGE_PASSWORD or similar pending state
 * - Invitation emails contain temporary passwords or activation links
 * - Rate limiting applied to prevent email spam and abuse
 * - Previous invitation emails may be invalidated upon resend
 * - Administrative privileges typically required for invitation management
 *
 * **Integration Points:**
 * - AwsCognitoLibService: User invitation management and email delivery coordination
 * - Email Service: Invitation email template rendering and delivery
 * - Logging: Comprehensive audit trail for invitation activities and user onboarding
 *
 * **Email Content:**
 * - Welcome message with organization branding
 * - Temporary password or secure activation link
 * - Account setup instructions and requirements
 * - Contact information for support and assistance
 * - Password policy requirements and security guidelines
 *
 * **Error Scenarios:**
 * - User not found: Returns 400 with user identification error
 * - User already activated: Returns appropriate status indicating completion
 * - Email delivery failure: Logged but may not prevent operation completion
 * - Rate limiting exceeded: Returns rate limit error with retry guidance
 * - AWS Cognito service errors: Logged and wrapped in standard error response format
 *
 * **Use Cases:**
 * - Employee onboarding: New hire account activation
 * - Partner management: External user account provisioning
 * - Invitation recovery: Users who lost or didn't receive original invitations
 * - Bulk onboarding: Organizational user import and activation
 * - Account reactivation: Reissuing invitations for pending accounts
 *
 * **Security Considerations:**
 * - Invitation resend attempts logged for security monitoring
 * - Rate limiting prevents email flooding and potential abuse
 * - Temporary passwords or activation links have limited validity periods
 * - Audit trail maintained for compliance and security investigations
 */
@CommandHandler(ResendInvitationCommand)
export class ResendInvitationHandler implements ICommandHandler<ResendInvitationCommand> {
    protected readonly logger = new Logger(ResendInvitationHandler.name);

    constructor(private readonly cognitoService: AwsCognitoLibService) {}

    async execute(
        command: ResendInvitationCommand
    ): Promise<ResponseDto<AdminCreateUserCommandOutput | ErrorResponseDto>> {
        this.logger.log(`Resending account invitation for user: ${command.email}`);

        try {
            const cognitoDto: CognitoEmailDto = {
                email: command.email,
            };

            const cognitoResponse = await this.cognitoService.resendInvitation(cognitoDto);

            this.logger.log(`Account invitation resent successfully to: ${command.email}`);
            return new ResponseDto<AdminCreateUserCommandOutput>(cognitoResponse, 201);
        } catch (error) {
            this.logger.error(`Failed to resend invitation to ${command.email}: ${JSON.stringify(error)}`);

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
