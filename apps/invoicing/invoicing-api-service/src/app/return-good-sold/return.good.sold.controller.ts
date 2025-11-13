import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateReturnGoodSoldDto, ReturnGoodSoldDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveReturnGoodSoldCommand } from './command/approve-record/approve.command';
import { CreateReturnGoodSoldCommand } from './command/create/create.command';
import { DeleteReturnGoodSoldCommand } from './command/delete/delete.command';
import { DenyReturnGoodSoldCommand } from './command/deny-record/deny.command';
import { UpdateReturnGoodSoldCommand } from './command/update/update.command';
import { GetReturnGoodSoldByCustomerIdQuery } from './queries/get.by.customerId/get.return.good.sold.by.customerId.query';
import { GetReturnGoodSoldByIdQuery } from './queries/get.by.id/get.return.good.sold.by.id.query';
import { GetReturnGoodSoldByInvoiceIdQuery } from './queries/get.by.invoiceId/get.return.good.sold.by.invoiceId.query';
import { GetReturnGoodSoldByRgsDocnoQuery } from './queries/get.by.rgsDocno/get.return.good.sold.by.rgsDocno.query';
import { GetReturnGoodSoldRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetReturnGoodSoldRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('Return Good Sold')
@Controller('return-good-sold')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ReturnGoodSoldController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create return good sold',
        description: 'Creates a new return good sold record',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    @ApiResponse({
        status: 201,
        description: 'Return Good Sold created successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                data: {
                    type: 'object',
                    properties: {
                        returnGoodSoldId: { type: 'string', example: 'return-123' },
                        invoiceId: { type: 'string', example: 'invoice-123' },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
                        invoiceDocno: { type: 'string', example: 'INV-2024-001' },
                        rgsDocno: { type: 'string', example: 'RGS-2024-001' },
                        dateReturned: { type: 'string', example: '2024-01-01' },
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
                message: { type: 'string', example: 'Invalid data provided' },
            },
        },
    })
    create(
        @Body() createReturnGoodSoldDto: CreateReturnGoodSoldDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateReturnGoodSoldCommand(createReturnGoodSoldDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update return good sold',
        description: 'Updates an existing return good sold record',
    })
    @ApiParam({
        name: 'id',
        description: 'Return Good Sold ID',
        example: 'return-123',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    @ApiResponse({
        status: 200,
        description: 'Return Good Sold updated successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        returnGoodSoldId: { type: 'string', example: 'return-123' },
                        invoiceId: { type: 'string', example: 'invoice-123' },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
                        invoiceDocno: { type: 'string', example: 'INV-2024-001' },
                        rgsDocno: { type: 'string', example: 'RGS-2024-001' },
                        dateReturned: { type: 'string', example: '2024-01-01' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Return Good Sold not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Return Good Sold not found' },
            },
        },
    })
    update(
        @Param('id') id: string,
        @Body() returnGoodSoldDto: ReturnGoodSoldDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateReturnGoodSoldCommand(id, returnGoodSoldDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete return good sold',
        description: 'Deletes a return good sold record',
    })
    @ApiParam({
        name: 'id',
        description: 'Return Good Sold ID',
        example: 'return-123',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    @ApiResponse({
        status: 200,
        description: 'Return Good Sold deleted successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        returnGoodSoldId: { type: 'string', example: 'return-123' },
                        status: { type: 'string', example: 'FOR_DELETION' },
                    },
                },
            },
        },
    })
    delete(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const returnGoodSoldDto = new ReturnGoodSoldDto();
        return this.commandBus.execute(new DeleteReturnGoodSoldCommand(id, returnGoodSoldDto, user));
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve return good sold',
        description: 'Approves a return good sold change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Return Good Sold ID',
        example: 'return-123',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    @ApiResponse({
        status: 200,
        description: 'Return Good Sold approved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        returnGoodSoldId: { type: 'string', example: 'return-123' },
                        invoiceId: { type: 'string', example: 'invoice-123' },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
                        invoiceDocno: { type: 'string', example: 'INV-2024-001' },
                        rgsDocno: { type: 'string', example: 'RGS-2024-001' },
                        dateReturned: { type: 'string', example: '2024-01-01' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    approve(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new ApproveReturnGoodSoldCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny return good sold',
        description: 'Denies a return good sold change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Return Good Sold ID',
        example: 'return-123',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    @ApiResponse({
        status: 200,
        description: 'Return Good Sold denied successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        returnGoodSoldId: { type: 'string', example: 'return-123' },
                        invoiceId: { type: 'string', example: 'invoice-123' },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
                        invoiceDocno: { type: 'string', example: 'INV-2024-001' },
                        rgsDocno: { type: 'string', example: 'RGS-2024-001' },
                        dateReturned: { type: 'string', example: '2024-01-01' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    deny(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyReturnGoodSoldCommand(id, user));
    }

    @Get()
    @ApiOperation({
        summary: 'List return good sold with pagination',
        description: 'Retrieves a paginated list of return good sold records with optional filtering',
    })
    @ApiQuery({
        name: 'limit',
        description: 'Number of records per page',
        required: false,
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
    @ApiResponse({
        status: 200,
        description: 'Return Good Sold records retrieved successfully',
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
                                    returnGoodSoldId: { type: 'string', example: 'return-123' },
                                    invoiceId: { type: 'string', example: 'invoice-123' },
                                    customerId: { type: 'string', example: 'customer-123' },
                                    customerName: { type: 'string', example: 'Acme Corp' },
                                    invoiceDocno: { type: 'string', example: 'INV-2024-001' },
                                    rgsDocno: { type: 'string', example: 'RGS-2024-001' },
                                    dateReturned: { type: 'string', example: '2024-01-01' },
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
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(new GetReturnGoodSoldRecordsPaginationQuery(limit, direction, cursorPointer));
    }

    @Get('/status')
    @ApiOperation({
        summary: 'List return good sold with pagination by status',
        description:
            'Retrieves a paginated list of return good sold records filtered by status. Use cursor-based pagination for optimal performance.',
    })
    @ApiQuery({ name: 'limit', description: 'Number of records per page', required: true, type: Number, example: 10 })
    @ApiQuery({
        name: 'direction',
        description: 'Pagination direction',
        required: false,
        enum: ['next', 'prev'],
        example: 'next',
    })
    @ApiQuery({ name: 'cursorPointer', description: 'Cursor pointer for pagination', required: false, type: String })
    @ApiQuery({
        name: 'status',
        type: String,
        required: true,
        description: 'Filter by status',
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD'],
    })
    @ApiQuery({
        name: 'rgsDocno',
        type: String,
        required: false,
        description: 'Filter by return good sold document number',
        example: 'RGS-2024-001',
    })
    @ApiResponse({ status: 200, description: 'Return Good Sold records retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad request - Invalid pagination parameters' })
    getRecordsPaginationByStatus(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('rgsDocno') rgsDocno?: string
    ) {
        return this.queryBus.execute(
            new GetReturnGoodSoldRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer, rgsDocno)
        );
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get return good sold by ID',
        description: 'Retrieves a return good sold record by their unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Return Good Sold ID',
        example: 'return-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Return Good Sold retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        returnGoodSoldId: { type: 'string', example: 'return-123' },
                        invoiceId: { type: 'string', example: 'invoice-123' },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
                        invoiceDocno: { type: 'string', example: 'INV-2024-001' },
                        rgsDocno: { type: 'string', example: 'RGS-2024-001' },
                        dateReturned: { type: 'string', example: '2024-01-01' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Return Good Sold not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Return Good Sold not found' },
            },
        },
    })
    getById(@Param('id') id: string) {
        return this.queryBus.execute(new GetReturnGoodSoldByIdQuery(id));
    }

    @Get('invoice/:invoiceId')
    @ApiOperation({
        summary: 'Get return good sold by invoice ID',
        description: 'Retrieves return good sold records by invoice ID with pagination',
    })
    @ApiParam({
        name: 'invoiceId',
        description: 'Invoice ID',
        example: 'invoice-123',
    })
    @ApiQuery({
        name: 'limit',
        description: 'Number of records per page',
        required: false,
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
    })
    @ApiResponse({
        status: 200,
        description: 'Return Good Sold records retrieved successfully',
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
                                    returnGoodSoldId: { type: 'string', example: 'return-123' },
                                    invoiceId: { type: 'string', example: 'invoice-123' },
                                    customerId: { type: 'string', example: 'customer-123' },
                                    customerName: { type: 'string', example: 'Acme Corp' },
                                    invoiceDocno: { type: 'string', example: 'INV-2024-001' },
                                    rgsDocno: { type: 'string', example: 'RGS-2024-001' },
                                    dateReturned: { type: 'string', example: '2024-01-01' },
                                    status: { type: 'string', example: 'ACTIVE' },
                                },
                            },
                        },
                        nextCursor: { type: 'string', nullable: true },
                        prevCursor: { type: 'string', nullable: true },
                    },
                },
            },
        },
    })
    getByInvoiceId(
        @Param('invoiceId') invoiceId: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(new GetReturnGoodSoldByInvoiceIdQuery(invoiceId, limit, direction, cursorPointer));
    }

    @Get('customer/:customerId')
    @ApiOperation({
        summary: 'Get return good sold by customer ID',
        description: 'Retrieves return good sold records by customer ID with pagination',
    })
    @ApiParam({
        name: 'customerId',
        description: 'Customer ID',
        example: 'customer-123',
    })
    @ApiQuery({
        name: 'limit',
        description: 'Number of records per page',
        required: false,
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
    })
    @ApiResponse({
        status: 200,
        description: 'Return Good Sold records retrieved successfully',
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
                                    returnGoodSoldId: { type: 'string', example: 'return-123' },
                                    invoiceId: { type: 'string', example: 'invoice-123' },
                                    customerId: { type: 'string', example: 'customer-123' },
                                    customerName: { type: 'string', example: 'Acme Corp' },
                                    invoiceDocno: { type: 'string', example: 'INV-2024-001' },
                                    rgsDocno: { type: 'string', example: 'RGS-2024-001' },
                                    dateReturned: { type: 'string', example: '2024-01-01' },
                                    status: { type: 'string', example: 'ACTIVE' },
                                },
                            },
                        },
                        nextCursor: { type: 'string', nullable: true },
                        prevCursor: { type: 'string', nullable: true },
                    },
                },
            },
        },
    })
    getByCustomerId(
        @Param('customerId') customerId: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(
            new GetReturnGoodSoldByCustomerIdQuery(customerId, limit, direction, cursorPointer)
        );
    }

    @Get('name/:rgsDocno')
    @ApiOperation({
        summary: 'Get return good sold by document number',
        description:
            'Retrieves return good sold records that contain the specified document number with pagination support.',
    })
    @ApiParam({
        name: 'rgsDocno',
        description: 'Return good sold document number to search for',
        example: 'RGS-2024',
    })
    @ApiQuery({
        name: 'limit',
        description: 'Number of records to return (1-100)',
        required: false,
        type: Number,
        example: 10,
    })
    @ApiQuery({
        name: 'direction',
        description: 'Page direction: "next" or "prev"',
        required: false,
        enum: ['next', 'prev'],
        example: 'next',
    })
    @ApiQuery({
        name: 'cursorPointer',
        description: 'Cursor for pagination',
        required: false,
        type: String,
        example: 'cursor_abc123',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'For Swagger consistency (not used in query endpoints)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'USER',
    })
    @ApiResponse({
        status: 200,
        description: 'Return Good Sold records retrieved successfully with pagination',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/ReturnGoodSoldDto' },
                        },
                        nextCursorPointer: { type: 'object' },
                        prevCursorPointer: { type: 'object' },
                    },
                },
            },
        },
    })
    getByRgsDocno(
        @Param('rgsDocno') rgsDocno: string,
        @Query('limit') limit?: number,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string,
        @Query('userRole') userRole?: string
    ) {
        // Note: userRole is included for Swagger consistency but not used in query endpoints
        const query = new GetReturnGoodSoldByRgsDocnoQuery(rgsDocno, limit, direction, cursorPointer);
        return this.queryBus.execute(query);
    }
}
