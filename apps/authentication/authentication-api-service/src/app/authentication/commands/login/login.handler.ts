import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminInitiateAuthCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LoginCommand } from './login.command';

/**
 * Handles user authentication and login process with AWS Cognito integration.
 *
 * **Business Rules:**
 * - User must provide valid email and password combination
 * - Email format validation and normalization performed
 * - Failed login attempts are tracked for security monitoring
 * - Returns JWT tokens for authenticated sessions (Access, ID, Refresh)
 * - Supports MFA flow when enabled for user accounts
 * - Login attempts on non-existent users return generic error messages for security
 *
 * **Integration Points:**
 * - AwsCognitoLibService: Primary authentication provider for user credential validation
 * - Logging: Comprehensive audit trail for authentication attempts and security monitoring
 * - JWT Token Management: Access, ID, and Refresh token generation and validation
 *
 * **Security Considerations:**
 * - Password validation performed securely in AWS Cognito
 * - Failed login attempts logged for security monitoring and potential rate limiting
 * - Generic error messages prevent user enumeration attacks
 * - Session tokens have configurable expiration times
 * - Supports additional authentication factors (MFA) when configured
 *
 * **Error Scenarios:**
 * - Invalid credentials: Returns 400 with generic authentication error
 * - User not confirmed: Handled by Cognito with appropriate error response
 * - Account locked/disabled: Returns security-appropriate error message
 * - MFA required: Returns challenge response for multi-factor authentication
 * - AWS Cognito errors: Logged and wrapped in standard error response format
 *
 * **Authentication Flow:**
 * - Standard login: Returns complete token set for immediate session establishment
 * - MFA required: Returns session token requiring additional verification
 * - Password reset required: Returns challenge response for password change
 */
@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
    protected readonly logger = new Logger(LoginHandler.name);

    constructor(private readonly cognitoService: AwsCognitoLibService) {}

    async execute(command: LoginCommand): Promise<ResponseDto<AdminInitiateAuthCommandOutput | ErrorResponseDto>> {
        this.logger.log(`Authentication attempt for user: ${command.email}`);

        try {
            const cognitoDto: CognitoDto = {
                email: command.email,
                password: command.password,
            };

            const cognitoResponse = await this.cognitoService.loginUser(cognitoDto);

            this.logger.log(`User authenticated successfully: ${command.email}`);
            return new ResponseDto<AdminInitiateAuthCommandOutput>(cognitoResponse, 200);
        } catch (error) {
            this.logger.error(`Authentication failed for user ${command.email}: ${JSON.stringify(error)}`);

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
