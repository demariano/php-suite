import { CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateTermsDto, TermsDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveTermsCommand } from './command/approve-record/approve.command';
import { CreateTermsCommand } from './command/create/create.command';
import { DeleteTermsCommand } from './command/delete/delete.command';
import { DenyTermsCommand } from './command/deny-record/deny.command';
import { UpdateTermsCommand } from './command/update/update.command';
import { GetTermsByIdQuery } from './queries/get.by.id/get.terms.by.id.query';
import { GetTermsByNameQuery } from './queries/get.by.name/get.terms.by.name.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('Terms')
@Controller('terms')
export class TermsController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create terms',
        description: 'Creates a new terms record',
    })
    @ApiResponse({
        status: 201,
        description: 'Terms created successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                data: {
                    type: 'object',
                    properties: {
                        termsId: { type: 'string', example: 'terms-123' },
                        termsName: { type: 'string', example: 'Standard Terms' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                message: { type: 'string', example: 'Terms name already exists' },
            },
        },
    })
    create(@Body() createTermsDto: CreateTermsDto, @CurrentUser() user: UserCognito) {
        return this.commandBus.execute(new CreateTermsCommand(createTermsDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update terms',
        description: 'Updates an existing terms record',
    })
    @ApiParam({
        name: 'id',
        description: 'Terms ID',
        example: 'terms-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Terms updated successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        termsId: { type: 'string', example: 'terms-123' },
                        termsName: { type: 'string', example: 'Standard Terms' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Terms not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Terms not found' },
            },
        },
    })
    update(@Param('id') id: string, @Body() termsDto: TermsDto, @CurrentUser() user: UserCognito) {
        return this.commandBus.execute(new UpdateTermsCommand(id, termsDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete terms',
        description: 'Deletes a terms record',
    })
    @ApiParam({
        name: 'id',
        description: 'Terms ID',
        example: 'terms-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Terms deleted successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        termsId: { type: 'string', example: 'terms-123' },
                        termsName: { type: 'string', example: 'Standard Terms' },
                        status: { type: 'string', example: 'FOR_DELETION' },
                    },
                },
            },
        },
    })
    delete(@Param('id') id: string, @CurrentUser() user: UserCognito) {
        const termsDto = new TermsDto();
        return this.commandBus.execute(new DeleteTermsCommand(id, termsDto, user));
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve terms',
        description: 'Approves a terms change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Terms ID',
        example: 'terms-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Terms approved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        termsId: { type: 'string', example: 'terms-123' },
                        termsName: { type: 'string', example: 'Standard Terms' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    approve(@Param('id') id: string, @CurrentUser() user: UserCognito) {
        return this.commandBus.execute(new ApproveTermsCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny terms',
        description: 'Denies a terms change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Terms ID',
        example: 'terms-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Terms denied successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        termsId: { type: 'string', example: 'terms-123' },
                        termsName: { type: 'string', example: 'Standard Terms' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    deny(@Param('id') id: string, @CurrentUser() user: UserCognito) {
        return this.commandBus.execute(new DenyTermsCommand(id, user));
    }

    @Get('search/:name')
    @ApiOperation({
        summary: 'Search terms by name',
        description: 'Searches for terms containing the specified name',
    })
    @ApiParam({
        name: 'name',
        description: 'Name to search for',
        example: 'Standard',
    })
    @ApiResponse({
        status: 200,
        description: 'Terms found successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            termsId: { type: 'string', example: 'terms-123' },
                            termsName: { type: 'string', example: 'Standard Terms' },
                            status: { type: 'string', example: 'ACTIVE' },
                        },
                    },
                },
            },
        },
    })
    getByName(@Param('name') name: string) {
        return this.queryBus.execute(new GetTermsByNameQuery(name));
    }

    @Get()
    @ApiOperation({
        summary: 'List terms with pagination',
        description: 'Retrieves a paginated list of terms with optional filtering',
    })
    @ApiQuery({
        name: 'limit',
        description: 'Number of records per page',
        required: true,
        type: Number,
        example: 10,
    })
    @ApiQuery({
        name: 'direction',
        description: 'Pagination direction',
        required: false,
        enum: ['next', 'prev'],
        example: 'next',
    })
    @ApiQuery({
        name: 'cursorPointer',
        description: 'Cursor pointer for pagination',
        required: false,
        type: String,
        example: 'eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ==',
    })
    @ApiQuery({
        name: 'status',
        description: 'Filter by status',
        required: true,
        enum: ['ACTIVE', 'FOR_APPROVAL', 'FOR_DELETION'],
        example: 'ACTIVE',
    })
    @ApiResponse({
        status: 200,
        description: 'Terms retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    termsId: { type: 'string', example: 'terms-123' },
                                    termsName: { type: 'string', example: 'Standard Terms' },
                                    status: { type: 'string', example: 'ACTIVE' },
                                },
                            },
                        },
                        nextCursor: {
                            type: 'string',
                            example: 'eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ==',
                        },
                        prevCursor: {
                            type: 'string',
                            example: 'eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ==',
                        },
                        hasNext: { type: 'boolean', example: true },
                        hasPrev: { type: 'boolean', example: false },
                    },
                },
            },
        },
    })
    getRecordsPagination(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string
    ) {
        return this.queryBus.execute(new GetRecordsPaginationQuery(status, limit, direction, cursorPointer));
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get terms by ID',
        description: 'Retrieves a terms record by their unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Terms ID',
        example: 'terms-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Terms retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        termsId: { type: 'string', example: 'terms-123' },
                        termsName: { type: 'string', example: 'Standard Terms' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Terms not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Terms not found' },
            },
        },
    })
    getById(@Param('id') id: string) {
        return this.queryBus.execute(new GetTermsByIdQuery(id));
    }
}
