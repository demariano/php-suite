import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateVoucherDto, VoucherDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveVoucherCommand } from './command/approve-record/approve.command';
import { CreateVoucherCommand } from './command/create/create.command';
import { DeleteVoucherCommand } from './command/delete/delete.command';
import { DenyVoucherCommand } from './command/deny-record/deny.command';
import { UpdateVoucherCommand } from './command/update/update.command';
import { GetVoucherByIdQuery } from './queries/get.by.id/get.voucher.by.id.query';
import { GetVoucherByVoucherNoQuery } from './queries/get.by.voucher.no/get.voucher.by.voucher.no.query';
import { GetVouchersContainingVoucherNoQuery } from './queries/get.containing.voucher.no/get.vouchers.containing.voucher.no.query';
import { GetVouchersByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.vouchers.by.status.pagination.query';
import { GetVouchersByVoucherDatePaginationQuery } from './queries/get.records.by.voucher.date.pagination/get.vouchers.by.voucher.date.pagination.query';
import { GetVouchersPaginationQuery } from './queries/get.records.pagination/get.vouchers.pagination.query';

@Controller('vouchers')
@ApiTags('vouchers')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class VouchersController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new voucher',
        description: 'Creates a new voucher with the provided information. Voucher number must be unique.',
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
        description: 'Voucher successfully created',
        type: VoucherDto,
        schema: {
            example: {
                statusCode: 201,
                body: {
                    voucherId: 'vch_123456789',
                    voucherNo: 'VCH-001',
                    voucherDate: '2024-01-01',
                    status: 'ACTIVE',
                    activityLogs: ['Voucher created by admin, status set to ACTIVE'],
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Voucher number already exists or validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Voucher number already exists' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CreateVoucherDto,
        description: 'Voucher creation payload',
        examples: {
            example1: {
                summary: 'Standard voucher creation',
                value: {
                    voucherNo: 'VCH-001',
                    voucherDate: '2024-01-01',
                    voucherAmount: 1000,
                },
            },
        },
    })
    createVoucher(
        @Body() createVoucherDto: CreateVoucherDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateVoucherCommand(createVoucherDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update voucher',
        description: 'Updates an existing voucher with new information. Voucher must exist in the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique voucher identifier',
        example: 'vch_123456789',
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
        description: 'Voucher successfully updated',
        type: VoucherDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Voucher not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Voucher not found' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: VoucherDto,
        description: 'Voucher update payload with modified fields',
    })
    updateVoucher(
        @Param('id') id: string,
        @Body() voucherDto: VoucherDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateVoucherCommand(id, voucherDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete voucher',
        description: 'Deletes a voucher. For regular users, marks for deletion. For admins, deletes immediately.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique voucher identifier',
        example: 'vch_123456789',
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
        description: 'Voucher successfully deleted or marked for deletion',
        type: VoucherDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Voucher not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Voucher not found' },
                    },
                },
            },
        },
    })
    deleteVoucher(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const voucherDto = new VoucherDto();
        return this.commandBus.execute(new DeleteVoucherCommand(id, voucherDto, user));
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve voucher',
        description: 'Approves a voucher that is pending approval or marked for deletion. Requires admin privileges.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique voucher identifier',
        example: 'vch_123456789',
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
        description: 'Voucher successfully approved',
        type: VoucherDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Voucher not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Voucher not found' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 403 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: {
                            type: 'string',
                            example: 'Current user is not authorized to approve voucher change request',
                        },
                    },
                },
            },
        },
    })
    approveVoucher(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new ApproveVoucherCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny voucher',
        description: 'Denies a voucher that is pending approval. Requires admin privileges.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique voucher identifier',
        example: 'vch_123456789',
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
        description: 'Voucher successfully denied',
        type: VoucherDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Voucher not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Voucher not found' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 403 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: {
                            type: 'string',
                            example: 'Current user is not authorized to deny voucher change request',
                        },
                    },
                },
            },
        },
    })
    denyVoucher(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyVoucherCommand(id, user));
    }

    @Get('voucher-no/:voucherNo')
    @ApiOperation({
        summary: 'Get voucher by voucher number',
        description: 'Retrieves a voucher record by its voucher number.',
    })
    @ApiParam({
        name: 'voucherNo',
        description: 'Voucher number to search for',
        example: 'VCH-001',
    })
    @ApiResponse({
        status: 200,
        description: 'Voucher found',
        type: VoucherDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Voucher not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Voucher not found' },
                    },
                },
            },
        },
    })
    getVoucherByVoucherNo(@Param('voucherNo') voucherNo: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetVoucherByVoucherNoQuery(voucherNo));
    }

    @Get('containing-voucher-no')
    @ApiOperation({
        summary: 'Get vouchers containing voucher number',
        description:
            'Retrieves voucher records containing the voucher number with pagination support. Returns paginated array of matching vouchers.',
    })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: true,
        description: 'Number of records to fetch (1-100)',
        example: 20,
    })
    @ApiQuery({
        name: 'voucherNo',
        type: String,
        required: true,
        description: 'Voucher number to search for',
        example: 'VCH',
    })
    @ApiQuery({
        name: 'direction',
        type: String,
        required: false,
        description: 'Page direction: "next" or "prev"',
        enum: ['next', 'prev'],
    })
    @ApiQuery({
        name: 'cursorPointer',
        type: String,
        required: false,
        description: 'Cursor for pagination - null for first page',
        example: 'cursor_abc123',
    })
    @ApiResponse({
        status: 200,
        description: 'Vouchers found with pagination',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/VoucherDto' },
                        },
                        nextCursorPointer: { type: 'string', nullable: true },
                        prevCursorPointer: { type: 'string', nullable: true },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid voucher number parameter',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: {
                            type: 'string',
                            example: 'Voucher number parameter is required and must be a string',
                        },
                    },
                },
            },
        },
    })
    getVouchersContainingVoucherNo(
        @Query('limit') limit: number,
        @Query('voucherNo') voucherNo: string,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(
            new GetVouchersContainingVoucherNoQuery(limit, voucherNo, direction, cursorPointer)
        );
    }

    @Get()
    @ApiOperation({
        summary: 'List vouchers with pagination',
        description: 'Retrieves a paginated list of vouchers. Use cursor-based pagination for optimal performance.',
    })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: true,
        description: 'Number of records to fetch (1-100)',
        example: 20,
    })
    @ApiQuery({
        name: 'direction',
        type: String,
        required: false,
        description: 'Page direction: "next" or "prev"',
        enum: ['next', 'prev'],
    })
    @ApiQuery({
        name: 'cursorPointer',
        type: String,
        required: false,
        description: 'Cursor for pagination - null for first page',
        example: 'cursor_abc123',
    })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of vouchers',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/VoucherDto' },
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                nextCursor: { type: 'string', nullable: true },
                                prevCursor: { type: 'string', nullable: true },
                                hasMore: { type: 'boolean' },
                            },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid pagination parameters',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Limit must be between 1 and 100' },
                    },
                },
            },
        },
    })
    getVouchersPagination(
        @Query('limit') limit: number,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetVouchersPaginationQuery(limit, direction, cursorPointer));
    }

    @Get('/status')
    @ApiOperation({
        summary: 'List vouchers with pagination by status',
        description:
            'Retrieves a paginated list of vouchers filtered by status. Use cursor-based pagination for optimal performance.',
    })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: true,
        description: 'Number of records to fetch (1-100)',
        example: 20,
    })
    @ApiQuery({
        name: 'direction',
        type: String,
        required: false,
        description: 'Page direction: "next" or "prev"',
        enum: ['next', 'prev'],
    })
    @ApiQuery({
        name: 'cursorPointer',
        type: String,
        required: false,
        description: 'Cursor for pagination - null for first page',
        example: 'cursor_abc123',
    })
    @ApiQuery({
        name: 'status',
        type: String,
        required: true,
        description: 'Filter by voucher status',
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD'],
    })
    @ApiQuery({
        name: 'voucherNo',
        type: String,
        required: false,
        description: 'Filter by voucher number',
        example: 'VCH',
    })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of vouchers',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/VoucherDto' },
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                nextCursor: { type: 'string', nullable: true },
                                prevCursor: { type: 'string', nullable: true },
                                hasMore: { type: 'boolean' },
                            },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid pagination parameters',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Limit must be between 1 and 100' },
                    },
                },
            },
        },
    })
    getVouchersPaginationByStatus(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('voucherNo') voucherNo: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(
            new GetVouchersByStatusPaginationQuery(limit, status, direction, cursorPointer, voucherNo)
        );
    }

    @Get('voucher-date')
    @ApiOperation({
        summary: 'List vouchers with pagination by voucher date',
        description:
            'Retrieves a paginated list of vouchers filtered by voucher date. Use cursor-based pagination for optimal performance.',
    })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: true,
        description: 'Number of records to fetch (1-100)',
        example: 20,
    })
    @ApiQuery({
        name: 'direction',
        type: String,
        required: false,
        description: 'Page direction: "next" or "prev"',
        enum: ['next', 'prev'],
    })
    @ApiQuery({
        name: 'cursorPointer',
        type: String,
        required: false,
        description: 'Cursor for pagination - null for first page',
        example: 'cursor_abc123',
    })
    @ApiQuery({
        name: 'voucherDate',
        type: String,
        required: true,
        description: 'Filter by voucher date (YYYY-MM-DD format)',
        example: '2024-01-01',
    })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of vouchers by date',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/VoucherDto' },
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                nextCursor: { type: 'string', nullable: true },
                                prevCursor: { type: 'string', nullable: true },
                                hasMore: { type: 'boolean' },
                            },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid pagination parameters',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Limit must be between 1 and 100' },
                    },
                },
            },
        },
    })
    getVouchersByVoucherDate(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(
            new GetVouchersByVoucherDatePaginationQuery(limit, startDate, endDate
                , direction, cursorPointer)
        );
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get voucher by ID',
        description: 'Retrieves a voucher record by its unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique voucher identifier',
        example: 'vch_123456789',
    })
    @ApiResponse({
        status: 200,
        description: 'Voucher found',
        type: VoucherDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Voucher not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Voucher not found' },
                    },
                },
            },
        },
    })
    getVoucherById(@Param('id') id: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetVoucherByIdQuery(id));
    }
}
