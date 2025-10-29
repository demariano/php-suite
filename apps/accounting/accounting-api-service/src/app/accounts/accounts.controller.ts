import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { AccountsDto, CreateAccountsDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveAccountsCommand } from './command/approve-record/approve.command';
import { CreateAccountsCommand } from './command/create/create.command';
import { DeleteAccountsCommand } from './command/delete/delete.command';
import { DenyAccountsCommand } from './command/deny-record/deny.command';
import { UpdateAccountsCommand } from './command/update/update.command';
import { GetAccountsByAccountTypeQuery } from './queries/get.by.account.type/get.accounts.by.account.type.query';
import { GetAccountsByIdQuery } from './queries/get.by.id/get.accounts.by.id.query';
import { GetAccountsByNameQuery } from './queries/get.by.name/get.accounts.by.name.query';
import { GetRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('accounts')
@ApiTags('accounts')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class AccountsController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new account',
        description: 'Creates a new account with the provided information. Account name must be unique.',
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
        description: 'Account successfully created',
        type: AccountsDto,
        schema: {
            example: {
                statusCode: 201,
                body: {
                    accountingId: 'acc_123456789',
                    accountName: 'Cash Account',
                    accountType: 'ASSET',
                    status: 'ACTIVE',
                    activityLogs: ['Account created by admin, status set to ACTIVE'],
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Account name already exists or validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Account name already exists' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CreateAccountsDto,
        description: 'Account creation payload',
        examples: {
            example1: {
                summary: 'Standard account creation',
                value: {
                    accountName: 'Cash Account',
                    accountType: 'ASSET',
                },
            },
        },
    })
    createAccount(
        @Body() createAccountsDto: CreateAccountsDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateAccountsCommand(createAccountsDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update account',
        description: 'Updates an existing account with new information. Account must exist in the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique account identifier',
        example: 'acc_123456789',
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
        description: 'Account successfully updated',
        type: AccountsDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Account not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Account not found' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: AccountsDto,
        description: 'Account update payload with modified fields',
    })
    updateAccount(
        @Param('id') id: string,
        @Body() accountsDto: AccountsDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateAccountsCommand(id, accountsDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete account',
        description: 'Deletes an account. For regular users, marks for deletion. For admins, deletes immediately.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique account identifier',
        example: 'acc_123456789',
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
        description: 'Account successfully deleted or marked for deletion',
        type: AccountsDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Account not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Account not found' },
                    },
                },
            },
        },
    })
    deleteAccount(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const accountsDto = new AccountsDto();
        return this.commandBus.execute(new DeleteAccountsCommand(id, accountsDto, user));
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve account',
        description: 'Approves an account that is pending approval or marked for deletion. Requires admin privileges.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique account identifier',
        example: 'acc_123456789',
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
        description: 'Account successfully approved',
        type: AccountsDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Account not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Account not found' },
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
                            example: 'Current user is not authorized to approve account change request',
                        },
                    },
                },
            },
        },
    })
    approveAccount(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new ApproveAccountsCommand(id, user));
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny account',
        description: 'Denies an account that is pending approval. Requires admin privileges.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique account identifier',
        example: 'acc_123456789',
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
        description: 'Account successfully denied',
        type: AccountsDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Account not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Account not found' },
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
                            example: 'Current user is not authorized to deny account change request',
                        },
                    },
                },
            },
        },
    })
    denyAccount(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new DenyAccountsCommand(id, user));
    }

    @Get('name/:name')
    @ApiOperation({
        summary: 'Get accounts by name',
        description:
            'Retrieves account records by name with pagination support. Returns paginated array of matching accounts.',
    })
    @ApiParam({
        name: 'name',
        description: 'Account name to search for',
        example: 'Cash',
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
        description: 'Accounts found with pagination',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/AccountsDto' },
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
        description: 'Bad request - Invalid name parameter',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Name parameter is required and must be a string' },
                    },
                },
            },
        },
    })
    getAccountByName(
        @Param('name') name: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetAccountsByNameQuery(name, limit, direction, cursorPointer));
    }

    @Get()
    @ApiOperation({
        summary: 'List accounts with pagination',
        description: 'Retrieves a paginated list of accounts. Use cursor-based pagination for optimal performance.',
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
        description: 'Paginated list of accounts',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/AccountsDto' },
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
    getAccountsPagination(
        @Query('limit') limit: number,
        @Query('direction') direction?: string,
        @Query('cursorPointer') cursorPointer?: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetRecordsPaginationQuery(limit, direction, cursorPointer));
    }

    @Get('/status')
    @ApiOperation({
        summary: 'List accounts with pagination by status',
        description:
            'Retrieves a paginated list of accounts filtered by status. Use cursor-based pagination for optimal performance.',
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
        description: 'Filter by account status',
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION'],
    })
    @ApiQuery({
        name: 'name',
        type: String,
        required: false,
        description: 'Filter by account name',
        example: 'Cash',
    })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of accounts',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/AccountsDto' },
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
    getAccountsPaginationByStatus(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('name') name: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(
            new GetRecordsByStatusPaginationQuery(status, limit, direction, cursorPointer, name)
        );
    }

    @Get('account-type')
    @ApiOperation({
        summary: 'List accounts with pagination by account type',
        description:
            'Retrieves a paginated list of accounts filtered by account type. Use cursor-based pagination for optimal performance.',
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
        name: 'accountType',
        type: String,
        required: true,
        description: 'Filter by account type',
        enum: ['AREA', 'CUSTOMER', 'OTHERS'],
    })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of accounts by type',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/AccountsDto' },
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
    getAccountsByAccountType(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('accountType') accountType: string
    ) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetAccountsByAccountTypeQuery(accountType, limit, direction, cursorPointer));
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get account by ID',
        description: 'Retrieves an account record by its unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique account identifier',
        example: 'acc_123456789',
    })
    @ApiResponse({
        status: 200,
        description: 'Account found',
        type: AccountsDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Account not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Account not found' },
                    },
                },
            },
        },
    })
    getAccountById(@Param('id') id: string) {
        // Note: Query endpoints don't have @CurrentUser() so role override is not applicable
        // This is kept for consistency in Swagger documentation
        return this.queryBus.execute(new GetAccountsByIdQuery(id));
    }
}
