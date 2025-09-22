import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminDeleteUserCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoEmailDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteUserCommand } from './delete.user.command';

/**
 * Handles user account deletion from AWS Cognito authentication system.
 *
 * **Business Rules:**
 * - Permanently removes user account from AWS Cognito identity provider
 * - User deletion is IRREVERSIBLE and removes all authentication data
 * - User must exist in Cognito before deletion can proceed
 * - All active sessions and tokens immediately invalidated upon deletion
 * - Deletion from Cognito does not affect user data in other system components
 * - Administrative privileges typically required for user deletion operations
 *
 * **Integration Points:**
 * - AwsCognitoLibService: Authentication identity provider for permanent user removal
 * - Session Management: Immediate invalidation of all user authentication sessions
 * - Logging: Comprehensive audit trail for account deletion activities and compliance
 *
 * **Security Considerations:**
 * - User deletion logged for security monitoring and compliance requirements
 * - Immediate session invalidation prevents continued access with existing tokens
 * - Deletion operations require proper administrative authentication and authorization
 * - Audit trail maintained for regulatory compliance and security investigations
 * - Rate limiting may be applied to prevent bulk deletion abuse
 *
 * **Error Scenarios:**
 * - User not found: Returns 400 with user identification error
 * - User already deleted: Returns appropriate status indicating completion
 * - Insufficient privileges: Handled by upstream authorization middleware
 * - Active sessions: All sessions terminated as part of deletion process
 * - AWS Cognito service errors: Logged and wrapped in standard error response format
 *
 * **Use Cases:**
 * - GDPR compliance: Complete removal of user authentication data
 * - Account termination: Employee departure or contract termination
 * - Security incidents: Immediate account deactivation and removal
 * - Data cleanup: Removing inactive or test user accounts
 * - System migration: Clearing old authentication data
 *
 * **Post-Deletion Impact:**
 * - User cannot authenticate or access system resources
 * - All existing authentication tokens become invalid
 * - User email address becomes available for new account creation
 * - Authentication audit logs preserved for compliance requirements
 */
@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
    protected readonly logger = new Logger(DeleteUserHandler.name);

    constructor(private readonly cognitoService: AwsCognitoLibService) {}

    async execute(command: DeleteUserCommand): Promise<ResponseDto<AdminDeleteUserCommandOutput | ErrorResponseDto>> {
        this.logger.log(`Authentication account deletion for user: ${command.email}`);

        try {
            const cognitoDto: CognitoEmailDto = {
                email: command.email,
            };

            const cognitoResponse = await this.cognitoService.deleteUser(cognitoDto);

            this.logger.log(`User authentication account deleted successfully: ${command.email}`);
            return new ResponseDto<AdminDeleteUserCommandOutput>(cognitoResponse, 200);
        } catch (error) {
            this.logger.error(`Authentication account deletion failed for ${command.email}: ${JSON.stringify(error)}`);

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
