import { EmailNotificationDto } from '@dto';
import {
    Body,
    Controller,
    Get,
    MaxFileSizeValidator,
    ParseFilePipe,
    Post,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { SendEmailCommand } from './commands/send.email/send.email.command';

@ApiTags('Email') // Optional: Tag your controller for better Swagger organization
@Controller()
export class AppController {
    constructor(private readonly appService: AppService, private readonly commandBus: CommandBus) {}

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
                service: { type: 'string', example: 'email-api-service' },
            },
        },
    })
    healthCheck() {
        return this.appService.healthCheck();
    }

    @Get('version')
    @ApiOperation({
        summary: 'Get service version',
        description: 'Returns the current version of the email service',
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

    @Post('email')
    @UseInterceptors(AnyFilesInterceptor())
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: 'Send email with attachments',
        description:
            'Sends an email with HTML and text content, optionally including file attachments. Maximum file size: 1MB per file.',
    })
    @ApiResponse({
        status: 201,
        description: 'Email sent successfully',
        schema: {
            example: {
                statusCode: 201,
                body: 'Email sent successfully',
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid email data or file validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid email address or file size exceeds limit' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable entity - Email delivery failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 422 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Email delivery failed - invalid recipient address' },
                    },
                },
            },
        },
    })
    @ApiBody({
        description: 'Send an email with optional file attachments',
        required: true,
        schema: {
            type: 'object',
            properties: {
                toAddress: { type: 'string', example: 'user@example.com', description: 'Recipient email address' },
                subjectData: { type: 'string', example: 'Important Document', description: 'Email subject line' },
                messageBodyHtmlData: {
                    type: 'string',
                    example: '<h1>Hello!</h1><p>Please find the attached document.</p>',
                    description: 'HTML email body',
                },
                messageBodyTextData: {
                    type: 'string',
                    example: 'Hello! Please find the attached document.',
                    description: 'Plain text email body',
                },
                source: { type: 'string', example: 'noreply@company.com', description: 'Sender email address' },
                replyToAddress: {
                    type: 'string',
                    example: 'support@company.com',
                    description: 'Reply-to email address (optional)',
                },
                files: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary',
                    },
                    description: 'Optional file attachments (max 1MB each)',
                },
            },
            required: ['toAddress', 'subjectData', 'messageBodyHtmlData', 'messageBodyTextData', 'source'],
        },
    })
    sendEmail(
        @Body() emailDto: EmailNotificationDto,
        @UploadedFiles(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 1000000 }), // 1MB
                ],
                fileIsRequired: false,
            })
        )
        files: Array<any>
    ) {
        return this.commandBus.execute(
            new SendEmailCommand(
                emailDto.toAddress,
                emailDto.source,
                emailDto.messageBodyHtmlData,
                emailDto.messageBodyTextData,
                emailDto.subjectData,
                files,
                emailDto.replyToAddress
            )
        );
    }
}
