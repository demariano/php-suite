import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';

import { Body, Post, UseGuards } from '@nestjs/common';

import { ApiKeyHeaderGuard } from '@auth-guard-lib';
import { InitializeEnvironmentDto } from '@dto';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('environment')
export class AppController {
    constructor(private readonly appService: AppService) {}

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
                service: { type: 'string', example: 'environment-initializer-api-service' },
            },
        },
    })
    healthCheck() {
        return this.appService.healthCheck();
    }

    @Get('version')
    @ApiOperation({
        summary: 'Get service version',
        description: 'Returns the current version of the environment initializer service',
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

    @Post('initialize-environment')
    @ApiOperation({
        summary: 'Initialize environment',
        description:
            'Initializes or configures environment settings and resources. This endpoint is typically used during deployment or environment setup.',
    })
    @ApiHeader({
        name: 'X-API-KEY',
        description: 'API key for service-to-service authentication',
        required: true,
    })
    @ApiResponse({
        status: 201,
        description: 'Environment successfully initialized',
        schema: {
            example: {
                statusCode: 201,
                body: {
                    environmentName: 'production',
                    status: 'initialized',
                    resourcesCreated: ['database-tables', 'default-configurations', 'security-policies'],
                    timestamp: '2024-01-15T10:30:00Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid environment configuration',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid environment configuration provided' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid API key',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 401 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid API key' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 409,
        description: 'Conflict - Environment already initialized',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 409 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Environment is already initialized' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: InitializeEnvironmentDto,
        description: 'Environment initialization configuration',
        examples: {
            production: {
                summary: 'Production environment setup',
                value: {
                    environmentName: 'production',
                    region: 'us-east-1',
                    configurations: {
                        databaseUrl: 'postgresql://prod-db:5432/app',
                        cacheEnabled: true,
                        logLevel: 'warn',
                    },
                    features: {
                        enableMetrics: true,
                        enableAuditLog: true,
                        enableRateLimit: true,
                    },
                },
            },
            staging: {
                summary: 'Staging environment setup',
                value: {
                    environmentName: 'staging',
                    region: 'us-west-2',
                    configurations: {
                        databaseUrl: 'postgresql://staging-db:5432/app',
                        cacheEnabled: false,
                        logLevel: 'debug',
                    },
                    features: {
                        enableMetrics: false,
                        enableAuditLog: true,
                        enableRateLimit: false,
                    },
                },
            },
        },
    })
    @UseGuards(ApiKeyHeaderGuard)
    initializeEnvironment(@Body() initializeEnvironmentDto: InitializeEnvironmentDto) {
        return this.appService.initializeEnvironment(initializeEnvironmentDto);
    }
}
