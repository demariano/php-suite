import { Controller, Get, Query } from '@nestjs/common';

import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { GetDownloadUrlQuery } from './queries/get.download.url/get.download.url.query';
import { GetUploadUrlQuery } from './queries/get.upload.url/get.upload.url.query';

@Controller()
@ApiTags('file')
export class AppController {
    constructor(private readonly appService: AppService, private readonly queryBus: QueryBus) {}

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
                service: { type: 'string', example: 'file-api-service' },
            },
        },
    })
    healthCheck() {
        return this.appService.healthCheck();
    }

    @Get('version')
    @ApiOperation({
        summary: 'Get service version',
        description: 'Returns the current version of the file service',
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

    @Get('upload-url')
    @ApiOperation({
        summary: 'Generate pre-signed upload URL',
        description: 'Generates a pre-signed URL for uploading files directly to S3 storage with specified parameters.',
    })
    @ApiQuery({
        name: 'bucketName',
        type: String,
        required: true,
        description: 'S3 bucket name where file will be uploaded',
        example: 'user-uploads',
    })
    @ApiQuery({
        name: 'key',
        type: String,
        required: true,
        description: 'File key/path in S3 bucket',
        example: 'documents/user123/report.pdf',
    })
    @ApiQuery({
        name: 'mimeType',
        type: String,
        required: true,
        description: 'MIME type of the file to upload',
        example: 'application/pdf',
    })
    @ApiQuery({
        name: 'expiration',
        type: Number,
        required: true,
        description: 'URL expiration time in seconds (max 3600)',
        example: 3600,
    })
    @ApiResponse({
        status: 200,
        description: 'Pre-signed upload URL generated successfully',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    uploadUrl: 'https://s3.amazonaws.com/bucket/file?X-Amz-Signature=...',
                    key: 'documents/user123/report.pdf',
                    bucket: 'user-uploads',
                    expiresAt: '2024-01-15T11:30:00Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid parameters',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid bucket name or file key' },
                    },
                },
            },
        },
    })
    async uploadFile(
        @Query('bucketName') bucketName: string,
        @Query('key') key: string,
        @Query('mimeType') mimeType: string,
        @Query('expiration') expiration: number
    ) {
        return this.queryBus.execute(new GetUploadUrlQuery(bucketName, key, mimeType, expiration));
    }

    @Get('download-url')
    @ApiOperation({
        summary: 'Generate pre-signed download URL',
        description:
            'Generates a pre-signed URL for downloading files directly from S3 storage with specified parameters.',
    })
    @ApiQuery({
        name: 'bucketName',
        type: String,
        required: true,
        description: 'S3 bucket name where file is stored',
        example: 'user-uploads',
    })
    @ApiQuery({
        name: 'key',
        type: String,
        required: true,
        description: 'File key/path in S3 bucket',
        example: 'documents/user123/report.pdf',
    })
    @ApiQuery({
        name: 'mimeType',
        type: String,
        required: true,
        description: 'MIME type of the file to download',
        example: 'application/pdf',
    })
    @ApiQuery({
        name: 'expiration',
        type: Number,
        required: true,
        description: 'URL expiration time in seconds (max 3600)',
        example: 3600,
    })
    @ApiResponse({
        status: 200,
        description: 'Pre-signed download URL generated successfully',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    downloadUrl: 'https://s3.amazonaws.com/bucket/file?X-Amz-Signature=...',
                    key: 'documents/user123/report.pdf',
                    bucket: 'user-uploads',
                    expiresAt: '2024-01-15T11:30:00Z',
                    contentType: 'application/pdf',
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'File not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'File not found in specified bucket' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid parameters',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid bucket name or file key' },
                    },
                },
            },
        },
    })
    async downloadFile(
        @Query('bucketName') bucketName: string,
        @Query('key') key: string,
        @Query('mimeType') mimeType: string,
        @Query('expiration') expiration: number
    ) {
        return this.queryBus.execute(new GetDownloadUrlQuery(bucketName, key, mimeType, expiration));
    }
}
