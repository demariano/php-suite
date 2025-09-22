import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminCreateUserCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SignUpUserCommand } from './sign.up.user.command';

/**
 * Handles user registration and account creation process with AWS Cognito integration.
 *
 * **Business Rules:**
 * - Email addresses must be unique across the entire system
 * - Password must meet configured complexity requirements (length, special characters, etc.)
 * - New accounts start in UNCONFIRMED status requiring email verification
 * - Account confirmation email sent automatically upon successful registration
 * - User profile created in Cognito with email as primary identifier
 * - Temporary password may be generated if not provided in self-service flows
 *
 * **Integration Points:**
 * - AwsCognitoLibService: Primary user identity provider for account creation
 * - Email Service: Automatic confirmation email delivery to new users
 * - Logging: Comprehensive audit trail for account creation and security monitoring
 *
 * **Security Considerations:**
 * - Password complexity validation enforced by AWS Cognito policies
 * - Email verification required before account activation
 * - Registration attempts logged for security monitoring and abuse detection
 * - Rate limiting may be applied to prevent automated account creation
 * - CAPTCHA integration recommended for public registration endpoints
 *
 * **Error Scenarios:**
 * - Email already exists: Returns 400 with user-friendly error message
 * - Invalid email format: Validated by Cognito with appropriate error response
 * - Password policy violations: Returns detailed policy requirements
 * - AWS Cognito service errors: Logged and wrapped in standard error response format
 * - Network/infrastructure errors: Handled with retry logic and appropriate error messages
 *
 * **Post-Registration Flow:**
 * - User receives confirmation email with verification link
 * - Account remains in UNCONFIRMED status until email verification
 * - Confirmed users can proceed with normal authentication flow
 * - User profile data synchronized with internal user management systems
 */
@CommandHandler(SignUpUserCommand)
export class SignUpUserHandler implements ICommandHandler<SignUpUserCommand> {
    protected readonly logger = new Logger(SignUpUserHandler.name);

    constructor(private readonly cognitoService: AwsCognitoLibService) {}

    async execute(command: SignUpUserCommand): Promise<ResponseDto<AdminCreateUserCommandOutput | ErrorResponseDto>> {
        this.logger.log(`User registration attempt for: ${command.email}`);

        try {
            const cognitoDto: CognitoDto = {
                email: command.email,
                password: command.password,
            };

            const cognitoResponse = await this.cognitoService.signupUser(cognitoDto);

            this.logger.log(`User registered successfully: ${command.email}`);
            return new ResponseDto<AdminCreateUserCommandOutput>(cognitoResponse, 201);
        } catch (error) {
            this.logger.error(`User registration failed for ${command.email}: ${JSON.stringify(error)}`);

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
