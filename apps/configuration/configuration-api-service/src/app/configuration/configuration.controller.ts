import { ApiKeyHeaderGuard, CognitoAuthGuard } from '@auth-guard-lib';
import { UpdateConfigurationDto } from '@dto';
import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateConfigurationCommand } from './commands/update.configuration/update.configuration.command';
import { GetByConfigurationRecordQuery } from './queries/get.configuration.record/getconfiguration.record';

@Controller('configuration')
@ApiTags('configuration')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ConfigurationController {
    constructor(private readonly queryBus: QueryBus, private readonly commandBus: CommandBus) {}

    @Get('/:configName')
    @ApiOperation({
        summary: 'Get configuration by name',
        description: 'Retrieves a configuration record by its name/type identifier.',
    })
    @ApiParam({
        name: 'configName',
        description: 'The configuration name/type to retrieve',
        example: 'email-settings',
    })
    @ApiResponse({
        status: 200,
        description: 'Configuration found',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    configName: 'email-settings',
                    configValue: {
                        smtpHost: 'smtp.example.com',
                        smtpPort: 587,
                        enableSsl: true,
                    },
                    dateCreated: '2024-01-15T10:30:00Z',
                    dateUpdated: '2024-01-15T15:45:00Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Configuration not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Configuration not found' },
                    },
                },
            },
        },
    })
    getByConfigurationType(@Param('configName') configName: string) {
        return this.queryBus.execute(new GetByConfigurationRecordQuery(configName));
    }

    @Put()
    @ApiOperation({
        summary: 'Update configuration',
        description: 'Updates an existing configuration with new values. Creates configuration if it does not exist.',
    })
    @ApiResponse({
        status: 200,
        description: 'Configuration successfully updated',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    configName: 'email-settings',
                    configValue: {
                        smtpHost: 'smtp.newprovider.com',
                        smtpPort: 587,
                        enableSsl: true,
                    },
                    dateUpdated: '2024-01-15T16:30:00Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid configuration data',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid configuration format' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: UpdateConfigurationDto,
        description: 'Configuration update payload',
        examples: {
            example1: {
                summary: 'Email settings update',
                value: {
                    configName: 'email-settings',
                    configValue: {
                        smtpHost: 'smtp.newprovider.com',
                        smtpPort: 587,
                        enableSsl: true,
                        username: 'admin@company.com',
                    },
                },
            },
        },
    })
    updateConfiguration(@Body() configurationDto: UpdateConfigurationDto) {
        return this.commandBus.execute(new UpdateConfigurationCommand(configurationDto));
    }

    @Put('x-api-key')
    @ApiOperation({
        summary: 'Update configuration (API Key)',
        description: 'Updates configuration using API key authentication for service-to-service communication.',
    })
    @ApiHeader({
        name: 'X-API-KEY',
        description: 'API key for service-to-service authentication',
        required: true,
    })
    @ApiResponse({
        status: 200,
        description: 'Configuration successfully updated',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    configName: 'system-settings',
                    configValue: {
                        maintenanceMode: false,
                        debugLevel: 'info',
                    },
                    dateUpdated: '2024-01-15T16:30:00Z',
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
        status: 400,
        description: 'Bad request - Invalid configuration data',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid configuration format' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: UpdateConfigurationDto,
        description: 'Configuration update payload for service access',
    })
    @UseGuards(ApiKeyHeaderGuard)
    updateConfigurationViaXApiKey(@Body() configurationDto: UpdateConfigurationDto) {
        return this.commandBus.execute(new UpdateConfigurationCommand(configurationDto));
    }
}
