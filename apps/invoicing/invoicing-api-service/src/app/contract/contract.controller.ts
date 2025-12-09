import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { ContractDto, CreateContractDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveContractCommand } from './command/approve-record/approve.command';
import { CreateContractCommand } from './command/create/create.command';
import { DeleteContractCommand } from './command/delete/delete.command';
import { DenyContractCommand } from './command/deny-record/deny.command';
import { DenyContractDto } from './command/deny-record/deny.dto';
import { UpdateContractCommand } from './command/update/update.command';
import { GetContractByContractNoQuery } from './queries/get.by.contractNo/get.contract.by.contractNo.query';
import { GetContractsByCustomerIdQuery } from './queries/get.by.customerId/get.contracts.by.customerId.query';
import { GetContractByIdQuery } from './queries/get.by.id/get.contract.by.id.query';
import { GetContractsContainingContractNoQuery } from './queries/get.containing.contractNo/get.contracts.containing.contractNo.query';
import { GetPendingPaymentContractsQuery } from './queries/get.pending.payment.contracts/get.pending.payment.contracts.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('contracts')
@Controller('contracts')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ContractController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create contract',
        description: 'Creates a new contract record',
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
        description: 'Contract created successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                data: {
                    type: 'object',
                    properties: {
                        contractId: { type: 'string', example: 'contract-123' },
                        contractNo: { type: 'string', example: 'CT-2024-001' },
                        contractName: { type: 'string', example: 'Software License Agreement' },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
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
                message: { type: 'string', example: 'Contract number already exists' },
            },
        },
    })
    create(
        @Body() createContractDto: CreateContractDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateContractCommand(createContractDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update contract',
        description: 'Updates an existing contract record',
    })
    @ApiParam({
        name: 'id',
        description: 'Contract ID',
        example: 'contract-123',
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
        description: 'Contract updated successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        contractId: { type: 'string', example: 'contract-123' },
                        contractNo: { type: 'string', example: 'CT-2024-001' },
                        contractName: { type: 'string', example: 'Software License Agreement' },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Contract not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Contract not found' },
            },
        },
    })
    update(
        @Param('id') id: string,
        @Body() contractDto: ContractDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateContractCommand(id, contractDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete contract',
        description: 'Deletes a contract record',
    })
    @ApiParam({
        name: 'id',
        description: 'Contract ID',
        example: 'contract-123',
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
        description: 'Contract deleted successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        contractId: { type: 'string', example: 'contract-123' },
                        contractNo: { type: 'string', example: 'CT-2024-001' },
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

        const contractDto = new ContractDto();
        return this.commandBus.execute(new DeleteContractCommand(id, contractDto, user));
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve contract',
        description: 'Approves a contract change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Contract ID',
        example: 'contract-123',
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
        description: 'Contract approved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        contractId: { type: 'string', example: 'contract-123' },
                        contractNo: { type: 'string', example: 'CT-2024-001' },
                        contractName: { type: 'string', example: 'Software License Agreement' },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
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

        return this.commandBus.execute(new ApproveContractCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny contract',
        description: 'Denies a contract change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Contract ID',
        example: 'contract-123',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    @ApiBody({
        type: DenyContractDto,
        description: 'Deny reason details',
    })
    @ApiResponse({
        status: 200,
        description: 'Contract denied successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        contractId: { type: 'string', example: 'contract-123' },
                        contractNo: { type: 'string', example: 'CT-2024-001' },
                        contractName: { type: 'string', example: 'Software License Agreement' },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid approver message',
    })
    deny(
        @Param('id') id: string,
        @Body() denyDto: DenyContractDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyContractCommand(id, user, denyDto.approverMessage));
    }

    @Get()
    @ApiOperation({
        summary: 'List contracts with pagination',
        description: 'Retrieves a paginated list of contracts with optional filtering',
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
        description: 'Contracts retrieved successfully',
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
                                    contractId: { type: 'string', example: 'contract-123' },
                                    contractNo: { type: 'string', example: 'CT-2024-001' },
                                    contractName: { type: 'string', example: 'Software License Agreement' },
                                    customerId: { type: 'string', example: 'customer-123' },
                                    customerName: { type: 'string', example: 'Acme Corp' },
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
        summary: 'List contracts with pagination by status',
        description:
            'Retrieves a paginated list of contracts filtered by status. Use cursor-based pagination for optimal performance.',
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
        name: 'customerId',
        type: String,
        required: true,
        description: 'Filter by customer ID',
        example: 'customer-123',
    })
    @ApiResponse({ status: 200, description: 'Contracts retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad request - Invalid pagination parameters' })
    getRecordsPaginationByStatus(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('customerId') customerId: string
    ) {
        return this.queryBus.execute(
            new GetRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer, customerId)
        );
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get contract by ID',
        description: 'Retrieves a contract record by their unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Contract ID',
        example: 'contract-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Contract retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        contractId: { type: 'string', example: 'contract-123' },
                        contractNo: { type: 'string', example: 'CT-2024-001' },
                        contractName: { type: 'string', example: 'Software License Agreement' },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Contract not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Contract not found' },
            },
        },
    })
    getById(@Param('id') id: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetContractByIdQuery(id));
    }

    @Get('no/:contractNo')
    @ApiOperation({
        summary: 'Get contract by contract number',
        description: 'Retrieves a contract record by their contract number',
    })
    @ApiParam({
        name: 'contractNo',
        description: 'Contract number',
        example: 'CT-2024-001',
    })
    @ApiResponse({
        status: 200,
        description: 'Contract retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        contractId: { type: 'string', example: 'contract-123' },
                        contractNo: { type: 'string', example: 'CT-2024-001' },
                        contractName: { type: 'string', example: 'Software License Agreement' },
                        customerId: { type: 'string', example: 'customer-123' },
                        customerName: { type: 'string', example: 'Acme Corp' },
                        status: { type: 'string', example: 'ACTIVE' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Contract not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Contract not found' },
            },
        },
    })
    getByContractNo(@Param('contractNo') contractNo: string) {
        return this.queryBus.execute(new GetContractByContractNoQuery(contractNo));
    }

    @Get('search/:contractNo')
    @ApiOperation({
        summary: 'Search contracts by contract number',
        description: 'Searches for contracts containing the specified contract number with pagination support',
    })
    @ApiParam({
        name: 'contractNo',
        description: 'Contract number to search for',
        example: 'CT-2024',
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
        description: 'Contracts found successfully with pagination',
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
                                    contractId: { type: 'string', example: 'contract-123' },
                                    contractNo: { type: 'string', example: 'CT-2024-001' },
                                    contractName: { type: 'string', example: 'Software License Agreement' },
                                    customerId: { type: 'string', example: 'customer-123' },
                                    customerName: { type: 'string', example: 'Acme Corp' },
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
    getContainingContractNo(
        @Param('contractNo') contractNo: string,
        @Query('limit') limit?: number,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string
    ) {
        return this.queryBus.execute(
            new GetContractsContainingContractNoQuery(contractNo, limit, direction, cursorPointer)
        );
    }

    @Get('customer/:customerId')
    @ApiOperation({
        summary: 'Get contracts by customer ID',
        description: 'Retrieves contracts for a specific customer with pagination support',
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
        example: 'eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ==',
    })
    @ApiResponse({
        status: 200,
        description: 'Contracts retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    contractId: { type: 'string', example: 'contract-123' },
                                    contractNo: { type: 'string', example: 'CT-2024-001' },
                                    contractName: { type: 'string', example: 'Software License Agreement' },
                                    customerId: { type: 'string', example: 'customer-123' },
                                    customerName: { type: 'string', example: 'Acme Corp' },
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
    getByCustomerId(
        @Param('customerId') customerId: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(new GetContractsByCustomerIdQuery(customerId, limit, direction, cursorPointer));
    }

    @Get('customer/:customerId/pending-payment')
    @ApiOperation({
        summary: 'Get pending payment contracts by customer ID',
        description: 'Retrieves contracts with pending or partial payment status for a specific customer',
    })
    @ApiParam({
        name: 'customerId',
        description: 'Customer ID',
        example: 'customer-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Pending payment contracts retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            contractId: { type: 'string', example: 'contract-123' },
                            contractNo: { type: 'string', example: 'CT-2024-001' },
                            contractName: { type: 'string', example: 'Software License Agreement' },
                            customerId: { type: 'string', example: 'customer-123' },
                            customerName: { type: 'string', example: 'Acme Corp' },
                            paymentStatus: { type: 'string', example: 'PENDING' },
                            contractAmount: { type: 'number', example: 10000 },
                            amountPaid: { type: 'number', example: 0 },
                        },
                    },
                },
            },
        },
    })
    getPendingPaymentContracts(@Param('customerId') customerId: string) {
        return this.queryBus.execute(new GetPendingPaymentContractsQuery(customerId));
    }
}
