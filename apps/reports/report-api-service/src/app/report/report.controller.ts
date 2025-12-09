import { CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateReportDto, ReportDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateReportCommand } from './command/create/create.command';
import { DeleteReportCommand } from './command/delete/delete.command';
import { GetReportByIdQuery } from './queries/get.by.id/get.report.by.id.query';
import { GetReportRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('reports')
@ApiTags('reports')
export class ReportController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new report',
        description: 'Creates a new report with the provided information.',
    })
    @ApiResponse({
        status: 201,
        description: 'Report successfully created',
        type: ReportDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Validation failed',
    })
    @ApiBody({
        type: CreateReportDto,
        description: 'Report creation payload',
        examples: {
            example1: {
                summary: 'Standard report creation',
                value: {
                    reportName: 'Sales Report',
                    reportFilename: 'sales_report.xlsx',
                    status: 'READY',
                    headers: [{ description: 'Date', metaData: { type: 'string' } }],
                    rows: [{ Date: '2025-11-19', Sales: 1000 }],
                    createdBy: 'user_123',
                    dateRange: '2025-11',
                },
            },
        },
    })
    createReport(@Body() createReportDto: CreateReportDto, @CurrentUser() user: UserCognito) {
        const command = new CreateReportCommand(createReportDto, user);
        return this.commandBus.execute(command);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete report',
        description: 'Deletes a report from the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Report ID',
        example: 'rep_123456789',
    })
    @ApiResponse({
        status: 200,
        description: 'Report successfully deleted',
        type: ReportDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Report not found',
    })
    deleteReport(@Param('id') id: string) {
        const reportDto = new ReportDto();
        reportDto.reportId = id;
        const command = new DeleteReportCommand(id, reportDto, undefined); // User context can be added if available
        return this.commandBus.execute(command);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get report by ID',
        description: 'Retrieves a specific report by its unique identifier.',
    })
    @ApiParam({
        name: 'id',
        description: 'Report ID',
        example: 'rep_123456789',
    })
    @ApiResponse({
        status: 200,
        description: 'Report retrieved successfully',
        type: ReportDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Report not found',
    })
    getById(@Param('id') id: string) {
        const query = new GetReportByIdQuery(id);
        return this.queryBus.execute(query);
    }

    @Get()
    @ApiOperation({
        summary: 'Get reports with pagination',
        description: 'Retrieves reports with pagination support.',
    })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: true,
        description: 'Number of records to return (1-100)',
        example: 10,
    })
    @ApiQuery({
        name: 'direction',
        type: String,
        required: false,
        description: 'Page direction: "next" or "prev"',
        enum: ['next', 'prev'],
        example: 'next',
    })
    @ApiQuery({
        name: 'cursorPointer',
        type: String,
        required: false,
        description: 'Cursor for pagination',
        example: 'cursor_abc123',
    })
    @ApiResponse({
        status: 200,
        description: 'Reports retrieved successfully with pagination',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ReportDto' },
                },
                lastEvaluatedKey: { type: 'string' },
                count: { type: 'number' },
            },
        },
    })
    getRecordsPagination(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        const query = new GetReportRecordsPaginationQuery(limit, direction, cursorPointer);
        return this.queryBus.execute(query);
    }
}
