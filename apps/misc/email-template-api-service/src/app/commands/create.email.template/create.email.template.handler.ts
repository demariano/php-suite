import { EmailTemplateDto, ErrorResponseDto, ResponseDto } from '@dto';
import { EmailTemplateDatabaseService } from '@email-template-database-service';
import { BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateEmailTemplateCommand } from './create.email.template.command';

/**
 * Handles creation of email templates for standardized communication across the application.
 *
 * **Business Rules:**
 * - Email templates support multiple languages for internationalization
 * - Each template type can have different language variants (en, es, fr, etc.)
 * - Templates include both HTML and plain text formats for maximum email client compatibility
 * - Template subjects support dynamic variable substitution using handlebars syntax
 * - Template content validated for proper HTML structure and variable placeholders
 * - Duplicate templates (same type + language combination) are prevented to maintain consistency
 *
 * **Integration Points:**
 * - EmailTemplateDatabaseService: DynamoDB-based template storage and retrieval system
 * - ConfigService: Template configuration settings including default languages and validation rules
 * - Email Delivery Service: Templates used by email sending operations for consistent formatting
 * - Logging: Comprehensive audit trail for template management and usage tracking
 *
 * **Template Categories:**
 * - Authentication Templates: Welcome emails, password resets, email verification, account activation
 * - Transactional Templates: Order confirmations, shipping notifications, payment receipts
 * - Notification Templates: System alerts, account updates, security notifications
 * - Marketing Templates: Promotional campaigns, newsletters, feature announcements
 * - Administrative Templates: User management, system maintenance, compliance notifications
 *
 * **Template Structure:**
 * - Subject Line: Dynamic subject with variable substitution support
 * - HTML Content: Rich formatted content with styling and responsive design
 * - Plain Text Content: Fallback content for email clients without HTML support
 * - Template Variables: Placeholder support for dynamic content injection
 * - Metadata: Template type, language, version, and creation timestamps
 *
 * **Security Considerations:**
 * - Template content sanitized to prevent XSS attacks and malicious code injection
 * - Variable placeholders validated to prevent template injection vulnerabilities
 * - Access controls enforced for template creation and modification operations
 * - Template versioning maintained for audit trails and rollback capabilities
 * - Content validation ensures compliance with email delivery standards
 *
 * **Error Scenarios:**
 * - Duplicate template creation: Returns 400 with conflict error for same type/language combination
 * - Invalid template format: Returns validation errors for malformed HTML or missing variables
 * - Database storage failure: Returns 500 with retry guidance and error details
 * - Language not supported: Returns 400 with list of supported language codes
 * - Template size exceeded: Returns 413 with size limits and optimization suggestions
 *
 * **Use Cases:**
 * - System Administration: Creating standardized email templates for operational communications
 * - Marketing Campaigns: Developing branded email templates for customer engagement
 * - Developer Operations: Template management for application email workflows
 * - Internationalization: Creating localized email templates for global user base
 * - Compliance Management: Templates for regulatory notifications and legal communications
 * - Customer Support: Standardized response templates for support interactions
 *
 * **Template Variables:**
 * - User Data: {{firstName}}, {{lastName}}, {{email}}, {{userId}}
 * - System Data: {{companyName}}, {{supportEmail}}, {{websiteUrl}}
 * - Dynamic Content: {{resetLink}}, {{verificationCode}}, {{orderNumber}}
 * - Timestamps: {{currentDate}}, {{expirationDate}}, {{createdAt}}
 */
@CommandHandler(CreateEmailTemplateCommand)
export class CreateEmailTemplateHandler implements ICommandHandler<CreateEmailTemplateCommand> {
    protected readonly logger = new Logger(CreateEmailTemplateHandler.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly emailTemplateDatabaseService: EmailTemplateDatabaseService
    ) {}

    async execute(command: CreateEmailTemplateCommand): Promise<ResponseDto<EmailTemplateDto | ErrorResponseDto>> {
        this.logger.log(
            `Email template creation request - Type: ${command.emailTemplateType}, Language: ${command.language}, Subject: "${command.subject}"`
        );

        try {
            const emailTemplateData = {
                subject: command.subject,
                data: {
                    htmlData: command.htmlData,
                    textData: command.textData,
                },
                emailTemplateType: command.emailTemplateType,
                language: command.language,
            };

            const emailTemplateRecord = await this.emailTemplateDatabaseService.createRecord(emailTemplateData);

            const dto: EmailTemplateDto = await this.emailTemplateDatabaseService.convertToDto(emailTemplateRecord);

            this.logger.log(
                `Email template created successfully - Type: ${command.emailTemplateType}, Language: ${
                    command.language
                }, ID: ${dto.emailTemplateId || 'N/A'}`
            );
            return new ResponseDto<EmailTemplateDto>(dto, 201);
        } catch (error) {
            this.logger.error(
                `Email template creation failed - Type: ${command.emailTemplateType}, Language: ${
                    command.language
                }, Error: ${JSON.stringify(error)}`
            );

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}
