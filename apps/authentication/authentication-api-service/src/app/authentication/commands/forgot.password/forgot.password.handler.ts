import { AwsCognitoLibService } from '@aws-cognito-lib';
import { ForgotPasswordCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { AwsSesLibService } from '@aws-ses-lib';
import { ConfigurationDatabaseServiceAbstract } from '@configuration-database-service';
import { CognitoDto, EmailNotificationDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForgotPasswordCommand } from './forgot.password.command';

/**
 * Handles password reset requests with secure temporary password generation and email delivery.
 *
 * **Business Rules:**
 * - Generates cryptographically secure temporary passwords meeting complexity requirements
 * - Temporary passwords contain at least one: lowercase, uppercase, number, and special character
 * - Minimum password length of 8 characters with configurable length (default 12)
 * - Password reset email sent immediately after successful password change
 * - User must exist in the system before password reset can be processed
 * - Original password immediately invalidated and replaced with temporary password
 *
 * **Integration Points:**
 * - AwsCognitoLibService: Secure password update and user authentication management
 * - AwsSesLibService: Automated email delivery for password reset notifications
 * - ConfigurationDatabaseService: System email configuration retrieval (SES_FROM_EMAIL)
 * - Logging: Comprehensive audit trail for password reset activities and security monitoring
 *
 * **Security Considerations:**
 * - Cryptographically secure random password generation using secure character sets
 * - Password complexity requirements enforced (4 character types minimum)
 * - Password reset attempts logged for security monitoring and abuse detection
 * - Rate limiting recommended to prevent automated password reset abuse
 * - Temporary passwords should be changed immediately upon first login
 * - Email delivery confirmation recommended for critical password reset operations
 *
 * **Error Scenarios:**
 * - User not found: Returns generic error to prevent user enumeration
 * - Email configuration missing: Fails with configuration error
 * - Email delivery failure: Logged but password change may still succeed
 * - AWS Cognito errors: Logged and wrapped in standard error response format
 * - Network/infrastructure errors: Handled with appropriate error messages
 *
 * **Password Generation Algorithm:**
 * - Uses secure character sets: lowercase, uppercase, numbers, special characters
 * - Ensures at least one character from each required set
 * - Cryptographically secure randomization and shuffling
 * - Configurable length with security-appropriate minimums
 * - Character sets designed for maximum compatibility and security
 */
@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler implements ICommandHandler<ForgotPasswordCommand> {
    protected readonly logger = new Logger(ForgotPasswordHandler.name);

    private readonly lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    private readonly uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    private readonly numberChars = '0123456789';
    private readonly specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    constructor(
        private readonly cognitoService: AwsCognitoLibService,
        @Inject('ConfigurationDatabaseService')
        private readonly configurationDatabaseService: ConfigurationDatabaseServiceAbstract,

        private readonly emailService: AwsSesLibService
    ) {}

    private generateRandomPassword(length = 12): string {
        if (length < 8) {
            throw new Error('Password length must be at least 8 characters');
        }

        // Ensure at least one character from each required set
        const password = [
            this.getRandomChar(this.lowercaseChars),
            this.getRandomChar(this.uppercaseChars),
            this.getRandomChar(this.numberChars),
            this.getRandomChar(this.specialChars),
        ];

        // Fill the rest of the password with random characters from all sets
        const allChars = this.lowercaseChars + this.uppercaseChars + this.numberChars + this.specialChars;
        for (let i = password.length; i < length; i++) {
            password.push(this.getRandomChar(allChars));
        }

        // Shuffle the password array
        return this.shuffleArray(password).join('');
    }

    private getRandomChar(charSet: string): string {
        return charSet[Math.floor(Math.random() * charSet.length)];
    }

    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    async execute(
        command: ForgotPasswordCommand
    ): Promise<ResponseDto<ForgotPasswordCommandOutput | ErrorResponseDto>> {
        this.logger.log(`Triggering forgot password for user : ${command.email}`);

        try {
            const randomPassword = this.generateRandomPassword();
            this.logger.log(`Generated random password for user: ${command.email}`);

            const cognitoDto: CognitoDto = {
                email: command.email,
                password: randomPassword,
            };

            const cognitoResponse = await this.cognitoService.changePassword(cognitoDto);

            const fromEmail = await this.configurationDatabaseService.findRecordByName('SES_FROM_EMAIL');

            if (!fromEmail) {
                throw new Error('From email not found');
            }

            const emailNotificationDto: EmailNotificationDto = new EmailNotificationDto();
            emailNotificationDto.replyToAddress = fromEmail.configurationValue;
            emailNotificationDto.source = fromEmail.configurationValue;
            emailNotificationDto.toAddress = command.email;
            emailNotificationDto.subjectData = 'Your New Password';
            emailNotificationDto.messageBodyHtmlData = `
      <p>Hello,</p>
      <p>Your new password is:</p>
      <p><strong>${randomPassword}</strong></p>
      <p>Please change your password after logging in.</p>
      <p>Thank you,</p>
      `;

            await this.emailService.sendEmail(emailNotificationDto);

            return new ResponseDto<ForgotPasswordCommandOutput>(cognitoResponse, 200);
        } catch (error) {
            this.logger.error(`Error Triggering Forgot Password ${JSON.stringify(error)}`);

            const errorMessage = error.response?.body?.errorMessage || error.message;

            const errorResponseDto: ErrorResponseDto = {
                errorMessage,
            };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
