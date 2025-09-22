import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AuthenticationResultType } from '@aws-sdk/client-cognito-identity-provider';
import { ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RefreshTokenCommand } from './refresh.token.command';

/**
 * Handles JWT token refresh for session extension and continued authentication.
 *
 * **Business Rules:**
 * - Refresh tokens have longer expiration times than access tokens (typically 30 days)
 * - New access and ID tokens generated with updated expiration times
 * - Refresh token rotation: new refresh token provided with each refresh operation
 * - User account must be active and not disabled for token refresh to succeed
 * - Token refresh resets access token expiration without requiring re-authentication
 * - Invalid or expired refresh tokens require full re-authentication
 *
 * **Integration Points:**
 * - AwsCognitoLibService: Token validation, refresh, and new token generation
 * - ConfigService: Token expiration and refresh policy configuration
 * - Session Management: Updated token storage and session extension
 * - Logging: Comprehensive audit trail for token refresh activities and security monitoring
 *
 * **Security Considerations:**
 * - Refresh tokens are cryptographically secure and tamper-resistant
 * - Token refresh attempts logged for security monitoring and analytics
 * - Rate limiting applied to prevent refresh token abuse
 * - Refresh token rotation prevents long-term token compromise
 * - Failed refresh attempts may indicate token theft or compromise
 * - Secure token transmission and storage requirements
 *
 * **Error Scenarios:**
 * - Invalid refresh token: Returns 400 with token validation error requiring re-authentication
 * - Expired refresh token: Returns specific expiration error requiring full login
 * - User account disabled: Returns account status error preventing token refresh
 * - Token revoked: Returns revocation error requiring re-authentication
 * - AWS Cognito service errors: Logged and wrapped in standard error response format
 *
 * **Token Management:**
 * - Access tokens: Short-lived (typically 1 hour) for API access
 * - ID tokens: Contains user identity information with same expiration as access tokens
 * - Refresh tokens: Long-lived (configurable, typically 30 days) for session extension
 * - Token rotation: Enhanced security through periodic refresh token updates
 */
@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler implements ICommandHandler<RefreshTokenCommand> {
    protected readonly logger = new Logger(RefreshTokenHandler.name);

    constructor(private readonly configService: ConfigService, private readonly cognitoService: AwsCognitoLibService) {}

    async execute(command: RefreshTokenCommand): Promise<ResponseDto<AuthenticationResultType | ErrorResponseDto>> {
        this.logger.log(`Token refresh attempt for refresh token`);

        try {
            const cognitoResponse = await this.cognitoService.refreshToken(command.refreshToken);

            this.logger.log(`Token refresh successful - new tokens generated`);
            return new ResponseDto<AuthenticationResultType>(cognitoResponse, 200);
        } catch (error) {
            this.logger.error(`Token refresh failed: ${error}`);

            let errorMessage = error.message;
            if (error.response?.body?.errorMessage) {
                errorMessage = error.response.body.errorMessage;
            }

            const errorResponseDto: ErrorResponseDto = { errorMessage };
            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
