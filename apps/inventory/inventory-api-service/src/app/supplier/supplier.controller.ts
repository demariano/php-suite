import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateSupplierDto, SupplierDto, SupplierFilterDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveSupplierCommand } from './command/approve-record/approve.command';
import { CreateSupplierCommand } from './command/create/create.command';
import { DeleteSupplierCommand } from './command/delete/delete.command';
import { DenySupplierCommand } from './command/deny-record/deny.command';
import { DenySupplierDto } from './command/deny-record/deny.dto';
import { UpdateSupplierCommand } from './command/update/update.command';
import { GetSupplierByIdQuery } from './queries/get.by.id/get.supplier.by.id.query';
import { GetSupplierByNameQuery } from './queries/get.by.name/get.supplier.by.name.query';
import { GetRecordsByFilterPaginationQuery } from './queries/get.records.by.filter/get.records.by.filter.pagination.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('Supplier')
@Controller('supplier')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class SupplierController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create supplier',
        description: 'Creates a new supplier record',
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
        description: 'Supplier created successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                data: {
                    type: 'object',
                    properties: {
                        supplierId: { type: 'string', example: 'supplier-123' },
                        supplierName: { type: 'string', example: 'ABC Supplies' },
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
                message: { type: 'string', example: 'Supplier name already exists' },
            },
        },
    })
    create(
        @Body() createSupplierDto: CreateSupplierDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateSupplierCommand(createSupplierDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update supplier',
        description: 'Updates an existing supplier record',
    })
    @ApiParam({
        name: 'id',
        description: 'Supplier ID',
        example: 'supplier-123',
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
        description: 'Supplier updated successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        supplierId: { type: 'string', example: 'supplier-123' },
                        supplierName: { type: 'string', example: 'ABC Supplies' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Supplier not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Supplier not found' },
            },
        },
    })
    update(
        @Param('id') id: string,
        @Body() supplierDto: SupplierDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateSupplierCommand(id, supplierDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete supplier',
        description: 'Deletes a supplier record',
    })
    @ApiParam({
        name: 'id',
        description: 'Supplier ID',
        example: 'supplier-123',
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
        description: 'Supplier deleted successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        supplierId: { type: 'string', example: 'supplier-123' },
                        supplierName: { type: 'string', example: 'ABC Supplies' },
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

        const supplierDto = new SupplierDto();
        return this.commandBus.execute(new DeleteSupplierCommand(id, supplierDto, user));
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve supplier',
        description: 'Approves a supplier change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Supplier ID',
        example: 'supplier-123',
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
        description: 'Supplier approved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        supplierId: { type: 'string', example: 'supplier-123' },
                        supplierName: { type: 'string', example: 'ABC Supplies' },
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

        return this.commandBus.execute(new ApproveSupplierCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny supplier',
        description: 'Denies a supplier change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Supplier ID',
        example: 'supplier-123',
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
        description: 'Supplier denied successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        supplierId: { type: 'string', example: 'supplier-123' },
                        supplierName: { type: 'string', example: 'ABC Supplies' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    deny(@Param('id') id: string, @Body() denyDto: DenySupplierDto, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenySupplierCommand(id, user, denyDto.approverMessage));
    }

    @Get('name/:name')
    @ApiOperation({
        summary: 'Search suppliers by name',
        description: 'Searches for suppliers containing the specified name with pagination support',
    })
    @ApiParam({
        name: 'name',
        description: 'Name to search for',
        example: 'ABC',
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
    @ApiResponse({
        status: 200,
        description: 'Suppliers found successfully with pagination',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    supplierId: { type: 'string', example: 'supplier-123' },
                                    supplierName: { type: 'string', example: 'ABC Supplies' },
                                    status: { type: 'string', example: 'ACTIVE' },
                                },
                            },
                        },
                        nextCursorPointer: { type: 'string', nullable: true },
                        prevCursorPointer: { type: 'string', nullable: true },
                    },
                },
            },
        },
    })
    getByName(
        @Param('name') name: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetSupplierByNameQuery(name, limit, direction, cursorPointer));
    }

    @Get()
    @ApiOperation({
        summary: 'List suppliers with pagination',
        description: 'Retrieves a paginated list of suppliers. Use cursor-based pagination for optimal performance.',
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
    @ApiResponse({
        status: 200,
        description: 'Suppliers retrieved successfully',
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
                                    supplierId: { type: 'string', example: 'supplier-123' },
                                    supplierName: { type: 'string', example: 'ABC Supplies' },
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
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetRecordsPaginationQuery(limit, direction, cursorPointer));
    }

    @Get('/status')
    @ApiOperation({
        summary: 'List suppliers with pagination by status',
        description:
            'Retrieves a paginated list of suppliers filtered by status. Use cursor-based pagination for optimal performance.',
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
    @ApiQuery({ name: 'name', type: String, required: false, description: 'Filter by name', example: 'ABC' })
    @ApiResponse({ status: 200, description: 'Suppliers retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad request - Invalid pagination parameters' })
    getRecordsPaginationByStatus(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('name') name: string
    ) {
        return this.queryBus.execute(
            new GetRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer, name)
        );
    }

    @Get('/filter')
    @ApiOperation({
        summary: 'List suppliers with pagination by filter',
        description:
            'Retrieves a paginated list of suppliers filtered by multiple criteria. Use cursor-based pagination for optimal performance.',
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
        required: false,
        description: 'Filter by status',
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD'],
    })
    @ApiQuery({ name: 'supplierName', type: String, required: false, description: 'Filter by supplier name' })
    @ApiQuery({ name: 'supplierAddress', type: String, required: false, description: 'Filter by supplier address' })
    @ApiQuery({ name: 'supplierPhone', type: String, required: false, description: 'Filter by supplier phone' })
    @ApiQuery({ name: 'supplierEmail', type: String, required: false, description: 'Filter by supplier email' })
    @ApiQuery({
        name: 'supplierContactPerson',
        type: String,
        required: false,
        description: 'Filter by supplier contact person',
    })
    @ApiQuery({ name: 'reverse', type: Boolean, required: false, description: 'Reverse sort order' })
    @ApiResponse({ status: 200, description: 'Suppliers retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad request - Invalid pagination parameters' })
    getRecordsByFilterPagination(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('supplierName') supplierName: string,
        @Query('supplierAddress') supplierAddress: string,
        @Query('supplierPhone') supplierPhone: string,
        @Query('supplierEmail') supplierEmail: string,
        @Query('supplierContactPerson') supplierContactPerson: string,
        @Query('reverse') reverse: boolean
    ) {
        const filter: SupplierFilterDto = {
            status,
            supplierName,
            supplierAddress,
            supplierPhone,
            supplierEmail,
            supplierContactPerson,
            reverse,
        };

        return this.queryBus.execute(
            new GetRecordsByFilterPaginationQuery(filter, limit, direction, cursorPointer)
        );
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get supplier by ID',
        description: 'Retrieves a supplier record by their unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Supplier ID',
        example: 'supplier-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Supplier retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        supplierId: { type: 'string', example: 'supplier-123' },
                        supplierName: { type: 'string', example: 'ABC Supplies' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Supplier not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Supplier not found' },
            },
        },
    })
    getById(@Param('id') id: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetSupplierByIdQuery(id));
    }
}

