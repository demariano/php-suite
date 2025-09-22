import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { EmailTemplateDto } from '@dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { CreateEmailTemplateCommand } from './commands/create.email.template/create.email.template.command';
import { GetEmailTemplateByTypeAndLanguageQuery } from './queries/get.email.template.by.typeand.language/get.email.template.by.typeand.language.query';

@Controller('email-template')
@ApiTags('email-template')
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus
    ) {}

    @Get()
    @ApiOperation({
        summary: 'Health check',
        description: 'Returns service health status and basic information',
    })
    @ApiResponse({
        status: 200,
        description: 'Service is healthy',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'OK' },
                timestamp: { type: 'string', example: '2024-01-15T10:30:00Z' },
                service: { type: 'string', example: 'email-template-api-service' },
            },
        },
    })
    healthCheck() {
        return this.appService.healthCheck();
    }

    @Get('version')
    @ApiOperation({
        summary: 'Get service version',
        description: 'Returns the current version of the email template service',
    })
    @ApiResponse({
        status: 200,
        description: 'Service version information',
        schema: {
            type: 'object',
            properties: {
                version: { type: 'string', example: '1.0.0' },
                buildDate: { type: 'string', example: '2024-01-15T10:30:00Z' },
                commit: { type: 'string', example: 'abc123def' },
            },
        },
    })
    getVersion() {
        return this.appService.getVersion();
    }

    @Get('email-template')
    @ApiOperation({
        summary: 'Get email template by type and language',
        description: 'Retrieves an email template based on the template type and language combination.',
    })
    @ApiQuery({
        name: 'emailTemplateType',
        type: String,
        required: true,
        description: 'Type of email template to retrieve',
        example: 'welcome-email',
    })
    @ApiQuery({
        name: 'language',
        type: String,
        required: true,
        description: 'Language code for the template',
        example: 'en',
    })
    @ApiResponse({
        status: 200,
        description: 'Email template found',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    emailTemplateType: 'welcome-email',
                    language: 'en',
                    subject: 'Welcome to Our Platform!',
                    data: {
                        htmlData: '<h1>Welcome {{userName}}!</h1><p>Thank you for joining us.</p>',
                        textData: 'Welcome {{userName}}! Thank you for joining us.',
                    },
                    dateCreated: '2024-01-15T10:30:00Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Email template not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: {
                            type: 'string',
                            example: 'Email template not found for specified type and language',
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Missing required parameters',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'emailTemplateType and language are required' },
                    },
                },
            },
        },
    })
    async getEmailTemplate(@Query('emailTemplateType') emailTemplateType: string, @Query('language') language: string) {
        return this.queryBus.execute(new GetEmailTemplateByTypeAndLanguageQuery(emailTemplateType, language));
    }

    @Post()
    @ApiOperation({
        summary: 'Create email template',
        description: 'Creates a new email template with HTML and text content for a specific type and language.',
    })
    @ApiResponse({
        status: 201,
        description: 'Email template successfully created',
        schema: {
            example: {
                statusCode: 201,
                body: {
                    emailTemplateType: 'welcome-email',
                    language: 'en',
                    subject: 'Welcome to Our Platform!',
                    data: {
                        htmlData: '<h1>Welcome {{userName}}!</h1><p>Thank you for joining us.</p>',
                        textData: 'Welcome {{userName}}! Thank you for joining us.',
                    },
                    dateCreated: '2024-01-15T10:30:00Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid template data or validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: {
                            type: 'string',
                            example: 'Invalid email template format or missing required fields',
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 409,
        description: 'Conflict - Template already exists',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 409 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: {
                            type: 'string',
                            example: 'Email template already exists for this type and language',
                        },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: EmailTemplateDto,
        description: 'Email template creation payload',
        examples: {
            welcomeEmail: {
                summary: 'Welcome email template',
                value: {
                    emailTemplateType: 'welcome-email',
                    language: 'en',
                    subject: 'Welcome to Our Platform!',
                    data: {
                        htmlData:
                            '<h1>Welcome {{userName}}!</h1><p>Thank you for joining us. Click <a href="{{activationLink}}">here</a> to activate your account.</p>',
                        textData:
                            'Welcome {{userName}}! Thank you for joining us. Visit {{activationLink}} to activate your account.',
                    },
                },
            },
            passwordReset: {
                summary: 'Password reset template',
                value: {
                    emailTemplateType: 'password-reset',
                    language: 'en',
                    subject: 'Reset Your Password',
                    data: {
                        htmlData:
                            '<h2>Password Reset Request</h2><p>Click <a href="{{resetLink}}">here</a> to reset your password.</p>',
                        textData: 'Password Reset Request: Visit {{resetLink}} to reset your password.',
                    },
                },
            },
        },
    })
    async createEmailTemplate(@Body() emailTemplateDto: EmailTemplateDto) {
        return this.commandBus.execute(
            new CreateEmailTemplateCommand(
                emailTemplateDto.language,
                emailTemplateDto.emailTemplateType,
                emailTemplateDto.data.htmlData,
                emailTemplateDto.data.textData,
                emailTemplateDto.subject
            )
        );
    }
}
