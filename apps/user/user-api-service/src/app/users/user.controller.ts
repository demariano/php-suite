import { ApiKeyHeaderGuard, CognitoAuthGuard } from '@auth-guard-lib';
import { CreateUserDto, UserFilterDto, UsersDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
    ApiBearerAuth,
    ApiBody,
    ApiHeader,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { CreateUserCommand } from './commands/create.user/create.user.command';
import { HardDeleteUserCommand } from './commands/hard.delete.user/hard.delete.user.command';
import { SoftDeleteUserCommand } from './commands/soft.delete.user/soft.delete.user.command';
import { UpdateUserCommand } from './commands/update.user/update.user.command';
import { GetEmailByApiKeyQuery } from './queries/get.by.email.by.api.key/get.email.by.api.key.query';
import { GetUserByEmailQuery } from './queries/get.by.email/get.user.by.email.query';
import { GetUserByIdQuery } from './queries/get.by.id/get.user.by.id.query';
import { GetRecordsFilterQuery } from './queries/get.records.filter/get.records.pagination.query';
import { GetRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('users')
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class UserController {
    constructor(private readonly queryBus: QueryBus, private readonly commandBus: CommandBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new user',
        description:
            'Creates a new user account with the provided information. Email must be unique across the system.',
    })
    @ApiResponse({
        status: 201,
        description: 'User successfully created',
        type: UsersDto,
        schema: {
            example: {
                statusCode: 201,
                body: {
                    userId: 'user_123456789',
                    email: 'john.doe@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    userRole: 'USER',
                    userStatus: 'ACTIVE',
                    dateCreated: '2024-01-15T10:30:00Z',
                    data: { country: 'USA' },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Email already exists or validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Email already exists' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CreateUserDto,
        description: 'User creation payload',
        examples: {
            example1: {
                summary: 'Standard user creation',
                value: {
                    email: 'john.doe@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    userRole: 'USER',
                    data: { country: 'USA', preferences: { newsletter: true } },
                },
            },
        },
    })
    createRecord(@Body() createUserDto: CreateUserDto) {
        const command = new CreateUserCommand(createUserDto);
        return this.commandBus.execute(command);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update user',
        description: 'Updates an existing user with new information. User must exist in the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique user identifier',
        example: 'user_123456789',
    })
    @ApiResponse({
        status: 200,
        description: 'User successfully updated',
        type: UsersDto,
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'User not found' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Validation failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid user data provided' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: UsersDto,
        description: 'User update payload with modified fields',
    })
    updateRecord(@Param('id') id: string, @Body() updateUserDto: UsersDto) {
        const command = new UpdateUserCommand(id, updateUserDto);
        return this.commandBus.execute(command);
    }

    @Delete('soft/:id')
    @ApiOperation({
        summary: 'Soft delete user',
        description: 'Marks a user as deleted without permanently removing it. Can be restored later.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique user identifier',
        example: 'user_123456789',
    })
    @ApiResponse({
        status: 200,
        description: 'User successfully soft deleted',
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'User not found' },
                    },
                },
            },
        },
    })
    softDeleteRecord(@Param('id') id: string) {
        const command = new SoftDeleteUserCommand(id);
        return this.commandBus.execute(command);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete user permanently',
        description: 'Permanently removes a user from the system. This action cannot be undone.',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique user identifier',
        example: 'user_123456789',
    })
    @ApiResponse({
        status: 200,
        description: 'User successfully deleted',
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'User not found' },
                    },
                },
            },
        },
    })
    hardDeleteRecord(@Param('id') id: string) {
        const command = new HardDeleteUserCommand(id);
        return this.commandBus.execute(command);
    }

    @Get('email/:email')
    @ApiOperation({
        summary: 'Get user by email',
        description: 'Retrieves a user record by their email address',
    })
    @ApiParam({
        name: 'email',
        description: 'User email address',
        example: 'john.doe@example.com',
    })
    @ApiResponse({
        status: 200,
        description: 'User found',
        type: UsersDto,
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'User not found' },
                    },
                },
            },
        },
    })
    getByEmail(@Param('email') email: string) {
        return this.queryBus.execute(new GetUserByEmailQuery(email));
    }

    @Get('email-by-api-key/:email')
    @ApiOperation({
        summary: 'Get user by email (API Key)',
        description:
            'Retrieves a user record by email using API key authentication for service-to-service communication',
    })
    @ApiHeader({
        name: 'X-API-KEY',
        description: 'API key for service-to-service authentication',
        required: true,
    })
    @ApiParam({
        name: 'email',
        description: 'User email address',
        example: 'john.doe@example.com',
    })
    @ApiResponse({
        status: 200,
        description: 'User found',
        type: UsersDto,
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
        status: 404,
        description: 'User not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'User not found' },
                    },
                },
            },
        },
    })
    @UseGuards(ApiKeyHeaderGuard)
    getByEmailByApiKey(@Param('email') email: string) {
        return this.queryBus.execute(new GetEmailByApiKeyQuery(email));
    }

    @Get()
    @ApiOperation({
        summary: 'List users with pagination',
        description: 'Retrieves a paginated list of users. Use cursor-based pagination for optimal performance.',
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
        description: 'Paginated list of users',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/UsersDto' },
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
    getRecordsPagination(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(new GetRecordsPaginationQuery(limit, direction, cursorPointer));
    }

    @Get('filter')
    @ApiOperation({
        summary: 'Filter users with complex criteria',
        description:
            'Search and filter users using multiple criteria with pagination support. Apply filters for user status, role, and other attributes.',
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
        description: 'Filtered users with pagination',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                body: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/UsersDto' },
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
        description: 'Bad request - Invalid filter parameters',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid filter criteria provided' },
                    },
                },
            },
        },
    })
    getRecordsByFilterPagination(
        @Query(new ValidationPipe({ transform: true }))
        filterParams: UserFilterDto,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(new GetRecordsFilterQuery(filterParams, limit, direction, cursorPointer));
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get user by ID',
        description: 'Retrieves a user record by their unique identifier',
    })
    @ApiParam({
        name: 'id',
        description: 'Unique user identifier',
        example: 'user_123456789',
    })
    @ApiResponse({
        status: 200,
        description: 'User found',
        type: UsersDto,
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'User not found' },
                    },
                },
            },
        },
    })
    getById(@Param('id') id: string) {
        return this.queryBus.execute(new GetUserByIdQuery(id));
    }
}
