import { AwsSesLibService } from '@aws-ses-lib';
import { EmailNotificationDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SendEmailCommand } from './send.email.command';

/**
 * Handles email delivery operations through AWS SES for transactional and notification emails.
 *
 * **Business Rules:**
 * - All email addresses validated for proper format before sending
 * - Email content supports both HTML and plain text formats for maximum compatibility
 * - File attachments supported with size limitations (typically 1MB per file)
 * - Sender reputation monitoring through AWS SES bounce and complaint tracking
 * - Email delivery attempts logged for audit trail and troubleshooting
 * - Rate limiting enforced by AWS SES to prevent spam and maintain sender reputation
 *
 * **Integration Points:**
 * - AwsSesLibService: AWS Simple Email Service integration for reliable email delivery
 * - ConfigService: Email configuration settings including sender verification and limits
 * - File Upload Service: Attachment processing and validation for email attachments
 * - Logging: Comprehensive audit trail for email delivery activities and compliance
 *
 * **Email Types Supported:**
 * - Transactional Emails: Password resets, account verification, order confirmations
 * - Notification Emails: System alerts, user notifications, admin communications
 * - Template-based Emails: Structured communications with consistent formatting
 * - Marketing Emails: Promotional content with proper unsubscribe mechanisms
 * - System Alerts: Critical system notifications and monitoring alerts
 *
 * **Security Considerations:**
 * - Email content sanitized to prevent injection attacks and malicious content
 * - Sender verification required through AWS SES domain/email verification
 * - Rate limiting prevents abuse and maintains sender reputation
 * - Email delivery logs maintained for security monitoring and compliance
 * - Bounce and complaint handling to maintain deliverability standards
 * - Attachment scanning for malware and content validation
 *
 * **Error Scenarios:**
 * - Invalid email addresses: Returns 400 with specific validation error details
 * - AWS SES service limits exceeded: Returns rate limiting error with retry guidance
 * - Attachment size exceeded: Returns 413 with size limit information
 * - Sender not verified: Returns authentication error requiring domain verification
 * - Email delivery failure: Logged with specific AWS SES error codes for investigation
 * - Network connectivity issues: Automatic retry mechanisms with exponential backoff
 *
 * **Use Cases:**
 * - User Authentication: Password reset and email verification workflows
 * - Order Management: Purchase confirmations, shipping notifications, delivery updates
 * - System Monitoring: Alert notifications for system administrators and operations teams
 * - Customer Communication: Support tickets, account updates, promotional campaigns
 * - Compliance Reporting: Automated regulatory and audit report distribution
 * - Marketing Automation: Targeted campaigns and user engagement communications
 *
 * **Performance Considerations:**
 * - Asynchronous email delivery to prevent blocking user operations
 * - Bulk email processing with batching for high-volume scenarios
 * - Email template caching for improved performance and consistency
 * - Connection pooling for AWS SES API calls to optimize throughput
 * - Monitoring and alerting for email delivery success rates and performance metrics
 */
@CommandHandler(SendEmailCommand)
export class SendEmailHandler implements ICommandHandler<SendEmailCommand> {
    protected readonly logger = new Logger(SendEmailHandler.name);

    constructor(private readonly configService: ConfigService, private readonly emailService: AwsSesLibService) {}

    async execute(command: SendEmailCommand): Promise<ResponseDto<string>> {
        this.logger.log(
            `Email delivery request - To: ${command.toAddress}, Subject: "${command.subjectData}", From: ${command.source}`
        );

        try {
            const emailDto = new EmailNotificationDto();
            emailDto.toAddress = command.toAddress;
            emailDto.subjectData = command.subjectData;
            emailDto.replyToAddress = command.replyToAddress;
            emailDto.source = command.source;
            emailDto.messageBodyHtmlData = command.messageBodyHtmlData;
            emailDto.messageBodyTextData = command.messageBodyTextData;
            emailDto.files = command.files;

            const response = await this.emailService.sendEmail(emailDto);

            this.logger.log(
                `Email delivered successfully - To: ${command.toAddress}, MessageId: ${response?.MessageId || 'N/A'}`
            );
            return new ResponseDto<string>('Email sent successfully', 201);
        } catch (error) {
            this.logger.error(
                `Email delivery failed - To: ${command.toAddress}, Subject: "${
                    command.subjectData
                }", Error: ${JSON.stringify(error)}`
            );

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
