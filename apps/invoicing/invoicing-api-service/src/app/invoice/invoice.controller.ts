import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateInvoiceDto, InvoiceDetailsDto, InvoiceDto, ValidateInvoiceRequestDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveInvoiceCommand } from './command/approve-record/approve.command';
import { CreateInvoiceCommand } from './command/create/create.command';
import { DeleteInvoiceCommand } from './command/delete/delete.command';
import { DenyInvoiceCommand } from './command/deny-record/deny.command';
import { DenyInvoiceDto } from './command/deny-record/deny.dto';
import { SubmitDraftCommand } from './command/submit-draft/submit-draft.command';
import { UpdateInvoiceCommand } from './command/update/update.command';
import { ValidateInvoiceCommand } from './command/validate-invoice/validate-invoice.command';
import { ValidateStockCommand } from './command/validate-stock/validate-stock.command';
import { GetInvoicesByContractIdQuery } from './queries/get.by.contract.id/get.invoices.by.contract.id.query';
import { GetInvoiceByDocnoQuery } from './queries/get.by.docno/get.invoice.by.docno.query';
import { GetInvoiceByIdQuery } from './queries/get.by.id/get.invoice.by.id.query';
import { GetPendingPaymentInvoicesQuery } from './queries/get.pending.payment.invoices/get.pending.payment.invoices.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@ApiTags('invoices')
@Controller('invoices')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class InvoiceController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create invoice',
        description: 'Creates a new invoice record',
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
        description: 'Invoice created successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                data: {
                    type: 'object',
                    properties: {
                        invoiceId: { type: 'string', example: 'invoice-123' },
                        docno: { type: 'string', example: 'INV-001' },
                        invoiceDate: { type: 'string', example: '2024-01-01' },
                        customerName: { type: 'string', example: 'John Doe' },
                        finalAmount: { type: 'number', example: 1000.0 },
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
                message: { type: 'string', example: 'Invoice document number already exists' },
            },
        },
    })
    create(
        @Body() createInvoiceDto: CreateInvoiceDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateInvoiceCommand(createInvoiceDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update invoice',
        description: 'Updates an existing invoice record',
    })
    @ApiParam({
        name: 'id',
        description: 'Invoice ID',
        example: 'invoice-123',
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
        description: 'Invoice updated successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        invoiceId: { type: 'string', example: 'invoice-123' },
                        docno: { type: 'string', example: 'INV-001' },
                        invoiceDate: { type: 'string', example: '2024-01-01' },
                        customerName: { type: 'string', example: 'John Doe' },
                        finalAmount: { type: 'number', example: 1000.0 },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Invoice not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Invoice not found' },
            },
        },
    })
    update(
        @Param('id') id: string,
        @Body() invoiceDto: InvoiceDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateInvoiceCommand(id, invoiceDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete invoice',
        description: 'Deletes an invoice record',
    })
    @ApiParam({
        name: 'id',
        description: 'Invoice ID',
        example: 'invoice-123',
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
        description: 'Invoice deleted successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        invoiceId: { type: 'string', example: 'invoice-123' },
                        docno: { type: 'string', example: 'INV-001' },
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

        const invoiceDto = new InvoiceDto();
        return this.commandBus.execute(new DeleteInvoiceCommand(id, invoiceDto, user));
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve invoice',
        description: 'Approves an invoice change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Invoice ID',
        example: 'invoice-123',
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
        description: 'Invoice approved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        invoiceId: { type: 'string', example: 'invoice-123' },
                        docno: { type: 'string', example: 'INV-001' },
                        invoiceDate: { type: 'string', example: '2024-01-01' },
                        customerName: { type: 'string', example: 'John Doe' },
                        finalAmount: { type: 'number', example: 1000.0 },
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

        return this.commandBus.execute(new ApproveInvoiceCommand(id, user));
    }

    @Post(':id/submit-draft')
    @ApiOperation({
        summary: 'Submit draft invoice',
        description: 'Submits a draft invoice for approval or activation based on user role and amount',
    })
    @ApiParam({
        name: 'id',
        description: 'Invoice ID',
        example: 'invoice-123',
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
        description: 'Draft invoice submitted successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        invoiceId: { type: 'string', example: 'invoice-123' },
                        docno: { type: 'string', example: 'INV-001' },
                        status: { type: 'string', example: 'ACTIVE' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invoice is not a draft or validation failed',
    })
    @ApiResponse({
        status: 404,
        description: 'Invoice not found',
    })
    submitDraft(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new SubmitDraftCommand(id, user));
    }

    @Post('validate')
    @ApiOperation({
        summary: 'Validate invoice',
        description: 'Validates invoice data before creating, updating, or submitting draft',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                invoice: {
                    type: 'object',
                    description: 'Invoice data to validate',
                },
                validationType: {
                    type: 'string',
                    enum: ['create', 'update', 'submitDraft'],
                    description: 'Type of validation to perform',
                },
                existingInvoiceId: {
                    type: 'string',
                    description: 'Optional - existing invoice ID for update scenarios',
                },
            },
            required: ['invoice', 'validationType'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Validation result',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        valid: { type: 'boolean', example: true },
                        errors: {
                            type: 'object',
                            properties: {
                                contractAmountExceeded: {
                                    type: 'object',
                                    properties: {
                                        contractAmount: { type: 'number' },
                                        alreadyInvoiced: { type: 'number' },
                                        newAmount: { type: 'number' },
                                        remaining: { type: 'number' },
                                        message: { type: 'string' },
                                    },
                                },
                                missingFields: {
                                    type: 'array',
                                    items: { type: 'string' },
                                },
                                configurationError: { type: 'string' },
                                general: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    })
    validateInvoice(@Body() request: ValidateInvoiceRequestDto) {
        return this.commandBus.execute(new ValidateInvoiceCommand(request));
    }

    @Post('validate-stock')
    @ApiOperation({
        summary: 'Validate stock availability',
        description: 'Validates if sufficient stock is available for invoice details',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                invoiceDetails: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            stockId: { type: 'string' },
                            qty: { type: 'number' },
                            freeQty: { type: 'number' },
                        },
                    },
                },
                invoiceId: {
                    type: 'string',
                    description: 'Optional invoice ID to exclude its own reserved stock from validation',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Stock validation result',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        valid: { type: 'boolean', example: true },
                        invalidItems: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    stockId: { type: 'string' },
                                    stockName: { type: 'string' },
                                    productName: { type: 'string' },
                                    requested: { type: 'number' },
                                    available: { type: 'number' },
                                },
                            },
                        },
                    },
                },
            },
        },
    })
    validateStock(@Body() body: { invoiceDetails: InvoiceDetailsDto[] }) {
        return this.commandBus.execute(new ValidateStockCommand(body.invoiceDetails));
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny invoice',
        description: 'Denies an invoice change request',
    })
    @ApiParam({
        name: 'id',
        description: 'Invoice ID',
        example: 'invoice-123',
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
        type: DenyInvoiceDto,
        description: 'Deny reason details',
    })
    @ApiResponse({
        status: 200,
        description: 'Invoice denied successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        invoiceId: { type: 'string', example: 'invoice-123' },
                        docno: { type: 'string', example: 'INV-001' },
                        invoiceDate: { type: 'string', example: '2024-01-01' },
                        customerName: { type: 'string', example: 'John Doe' },
                        finalAmount: { type: 'number', example: 1000.0 },
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
        @Body() denyDto: DenyInvoiceDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyInvoiceCommand(id, user, denyDto.approverMessage));
    }

    @Get('docno/:docno')
    @ApiOperation({
        summary: 'Search invoices by document number',
        description: 'Searches for invoices containing the specified document number with pagination support',
    })
    @ApiParam({
        name: 'docno',
        description: 'Document number to search for',
        example: 'INV-001',
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
        description: 'Invoices found successfully with pagination',
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
                                    invoiceId: { type: 'string', example: 'invoice-123' },
                                    docno: { type: 'string', example: 'INV-001' },
                                    invoiceDate: { type: 'string', example: '2024-01-01' },
                                    customerName: { type: 'string', example: 'John Doe' },
                                    finalAmount: { type: 'number', example: 1000.0 },
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
    getByDocno(
        @Param('docno') docno: string,
        @Query('limit') limit?: number,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetInvoiceByDocnoQuery(docno, limit, direction, cursorPointer));
    }

    @Get()
    @ApiOperation({
        summary: 'List invoices with pagination',
        description: 'Retrieves a paginated list of invoices with optional filtering',
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
        description: 'Invoices retrieved successfully',
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
                                    invoiceId: { type: 'string', example: 'invoice-123' },
                                    docno: { type: 'string', example: 'INV-001' },
                                    invoiceDate: { type: 'string', example: '2024-01-01' },
                                    customerName: { type: 'string', example: 'John Doe' },
                                    finalAmount: { type: 'number', example: 1000.0 },
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
        summary: 'List invoices with pagination by status',
        description:
            'Retrieves a paginated list of invoices filtered by status. Use cursor-based pagination for optimal performance.',
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
        name: 'docno',
        type: String,
        required: false,
        description: 'Filter by document number',
        example: 'INV-001',
    })
    @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad request - Invalid pagination parameters' })
    getRecordsPaginationByStatus(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('docno') docno: string
    ) {
        return this.queryBus.execute(
            new GetRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer, docno)
        );
    }

    @Get('customer/:customerId/pending-payment')
    @ApiOperation({
        summary: 'Get pending payment invoices for customer',
        description: 'Retrieves all pending payment invoices for a specific customer with the given status',
    })
    @ApiParam({
        name: 'customerId',
        description: 'Customer ID',
        example: 'customer-123',
    })
    @ApiQuery({
        name: 'status',
        type: String,
        required: true,
        description: 'Invoice status to filter by',
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD'],
        example: 'ACTIVE',
    })
    @ApiQuery({
        name: 'contractId',
        type: String,
        required: false,
        description: 'Optional contract ID to filter invoices by contract',
        example: 'contract-123',
    })
    @ApiQuery({
        name: 'nonContractOnly',
        type: Boolean,
        required: false,
        description: 'If true, only return invoices that are not on a contract',
        example: true,
    })
    @ApiResponse({
        status: 200,
        description: 'Pending payment invoices retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            invoiceId: { type: 'string', example: 'invoice-123' },
                            docno: { type: 'string', example: 'INV-001' },
                            invoiceDate: { type: 'string', example: '2024-01-01' },
                            customerName: { type: 'string', example: 'John Doe' },
                            finalAmount: { type: 'number', example: 1000.0 },
                            status: { type: 'string', example: 'ACTIVE' },
                            paymentStatus: { type: 'string', example: 'PENDING' },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'No pending payment invoices found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: {
                    type: 'string',
                    example: 'No pending payment invoices found for customer customer-123 with status ACTIVE',
                },
            },
        },
    })
    getPendingPaymentInvoices(
        @Param('customerId') customerId: string,
        @Query('status') status: string,
        @Query('contractId') contractId?: string,
        @Query('nonContractOnly') nonContractOnly?: string | boolean
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        // Parse nonContractOnly - query params come as strings, so handle both string and boolean
        const nonContractOnlyBool =
            nonContractOnly === true ||
            (typeof nonContractOnly === 'string' && (nonContractOnly === 'true' || nonContractOnly === '1'));
        return this.queryBus.execute(
            new GetPendingPaymentInvoicesQuery(customerId, status, contractId, nonContractOnlyBool)
        );
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get invoice by ID',
        description: 'Retrieves an invoice record by their unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Invoice ID',
        example: 'invoice-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Invoice retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        invoiceId: { type: 'string', example: 'invoice-123' },
                        docno: { type: 'string', example: 'INV-001' },
                        invoiceDate: { type: 'string', example: '2024-01-01' },
                        customerName: { type: 'string', example: 'John Doe' },
                        finalAmount: { type: 'number', example: 1000.0 },
                        status: { type: 'string', example: 'ACTIVE' },
                        activityLogs: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Invoice not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Invoice not found' },
            },
        },
    })
    getById(@Param('id') id: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetInvoiceByIdQuery(id));
    }

    @Get('contract/:contractId')
    @ApiOperation({
        summary: 'Get invoices by contract ID',
        description: 'Retrieves all invoice records associated with a specific contract',
    })
    @ApiParam({
        name: 'contractId',
        description: 'Contract ID',
        example: 'contract-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Invoices retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            invoiceId: { type: 'string', example: 'invoice-123' },
                            docno: { type: 'string', example: 'INV-001' },
                            invoiceDate: { type: 'string', example: '2024-01-01' },
                            customerName: { type: 'string', example: 'John Doe' },
                            finalAmount: { type: 'number', example: 1000.0 },
                            contractId: { type: 'string', example: 'contract-123' },
                            contractName: { type: 'string', example: 'Annual Contract' },
                            status: { type: 'string', example: 'ACTIVE' },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'No invoices found for contract (returns empty array)',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: { type: 'array', example: [] },
            },
        },
    })
    getByContractId(@Param('contractId') contractId: string) {
        return this.queryBus.execute(new GetInvoicesByContractIdQuery(contractId));
    }
}
