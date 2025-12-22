import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CancelReceiptNumberRequestDto, CollectionReceiptRangeDto, CreateCollectionReceiptRangeDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CancelReceiptNumberCommand } from './command/cancel-receipt/cancel.receipt.command';
import { CreateCollectionReceiptRangeCommand } from './command/create/create.command';
import { DeleteCollectionReceiptRangeCommand } from './command/delete/delete.command';
import { UpdateCollectionReceiptRangeCommand } from './command/update/update.command';
import { GetCollectionReceiptRangesByAreaIdQuery } from './queries/get.by.areaId/get.collection.receipt.ranges.by.areaId.query';
import { GetCollectionReceiptRangeByIdQuery } from './queries/get.by.id/get.collection.receipt.range.by.id.query';
import { GetCollectionReceiptRangesByRangeStatusQuery } from './queries/get.by.rangeStatus/get.collection.receipt.ranges.by.rangeStatus.query';
import { GetCollectionReceiptRangesPaginationQuery } from './queries/get.records.pagination/get.collection.receipt.ranges.pagination.query';
import { GetNextReceiptQuery } from './queries/get.next.receipt/get.next.receipt.query';

@ApiTags('Collection Receipt Range')
@Controller('collection-receipt-range')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class CollectionReceiptRangeController {
    constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create collection receipt range',
        description: 'Creates a new collection receipt range record (Admin only)',
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
        type: CreateCollectionReceiptRangeDto,
        description: 'Collection receipt range data',
    })
    @ApiResponse({
        status: 201,
        description: 'Collection receipt range created successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                data: {
                    type: 'object',
                    properties: {
                        collectionReceiptRangeId: { type: 'string', example: 'range-123' },
                        areaId: { type: 'string', example: 'area-123' },
                        areaName: { type: 'string', example: 'Area A' },
                        startNumber: { type: 'number', example: 1 },
                        endNumber: { type: 'number', example: 1000 },
                        lastUsedNumber: { type: 'number', example: 0 },
                        rangeStatus: { type: 'string', example: 'AVAILABLE' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation failed',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Admin access required',
    })
    create(
        @Body() createRangeDto: CreateCollectionReceiptRangeDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CreateCollectionReceiptRangeCommand(createRangeDto, user));
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update collection receipt range',
        description: 'Updates an existing collection receipt range record (Admin only)',
    })
    @ApiParam({
        name: 'id',
        description: 'Collection Receipt Range ID',
        example: 'range-123',
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
        type: CollectionReceiptRangeDto,
        description: 'Updated collection receipt range data',
    })
    @ApiResponse({
        status: 200,
        description: 'Collection receipt range updated successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Admin access required',
    })
    update(
        @Param('id') id: string,
        @Body() updateRangeDto: CollectionReceiptRangeDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new UpdateCollectionReceiptRangeCommand(id, updateRangeDto, user));
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete collection receipt range',
        description: 'Deletes a collection receipt range record (Admin only)',
    })
    @ApiParam({
        name: 'id',
        description: 'Collection Receipt Range ID',
        example: 'range-123',
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
        description: 'Collection receipt range deleted successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Admin access required',
    })
    delete(
        @Param('id') id: string,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const rangeDto = new CollectionReceiptRangeDto();
        return this.commandBus.execute(new DeleteCollectionReceiptRangeCommand(id, rangeDto, user));
    }

    @Post('cancel-receipt')
    @ApiOperation({
        summary: 'Cancel a receipt number',
        description: 'Cancels a specific receipt number within a collection receipt range (Admin only)',
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
        type: CancelReceiptNumberRequestDto,
        description: 'Cancel receipt number request data',
    })
    @ApiResponse({
        status: 200,
        description: 'Receipt number cancelled successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Receipt number 500 cancelled successfully' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Receipt number out of range or already cancelled',
    })
    @ApiResponse({
        status: 404,
        description: 'Collection receipt range not found',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Admin access required',
    })
    cancelReceipt(
        @Body() cancelRequestDto: CancelReceiptNumberRequestDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        return this.commandBus.execute(new CancelReceiptNumberCommand(cancelRequestDto, user));
    }

    @Get('next-receipt/:areaId')
    @ApiOperation({
        summary: 'Get next available receipt number',
        description: 'Retrieves the next available receipt number for a given area. Used during payment creation.',
    })
    @ApiParam({
        name: 'areaId',
        description: 'Area ID',
        example: 'area-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Next available receipt number retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                data: {
                    type: 'object',
                    properties: {
                        receiptNumber: { type: 'number', example: 1001 },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - No receipt range assigned or all ranges exhausted',
    })
    getNextReceipt(@Param('areaId') areaId: string) {
        return this.queryBus.execute(new GetNextReceiptQuery(areaId));
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get collection receipt range by ID',
        description: 'Retrieves a collection receipt range by its ID',
    })
    @ApiParam({
        name: 'id',
        description: 'Collection Receipt Range ID',
        example: 'range-123',
    })
    @ApiResponse({
        status: 200,
        description: 'Collection receipt range retrieved successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Collection receipt range not found',
    })
    getById(@Param('id') id: string) {
        return this.queryBus.execute(new GetCollectionReceiptRangeByIdQuery(id));
    }

    @Get('area/:areaId')
    @ApiOperation({
        summary: 'Get collection receipt ranges by area ID',
        description: 'Retrieves paginated collection receipt ranges for a specific area',
    })
    @ApiParam({
        name: 'areaId',
        description: 'Area ID',
        example: 'area-123',
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
        description: 'Collection receipt ranges retrieved successfully',
    })
    getByAreaId(
        @Param('areaId') areaId: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(
            new GetCollectionReceiptRangesByAreaIdQuery(
                areaId,
                limit || 10,
                direction || 'next',
                cursorPointer && cursorPointer.trim() !== '' ? cursorPointer : undefined
            )
        );
    }

    @Get('status/:rangeStatus')
    @ApiOperation({
        summary: 'Get collection receipt ranges by status',
        description: 'Retrieves paginated collection receipt ranges by range status',
    })
    @ApiParam({
        name: 'rangeStatus',
        description: 'Range Status',
        enum: ['AVAILABLE', 'ALL_USED_UP', 'CANCELLED'],
        example: 'AVAILABLE',
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
        description: 'Collection receipt ranges retrieved successfully',
    })
    getByRangeStatus(
        @Param('rangeStatus') rangeStatus: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(
            new GetCollectionReceiptRangesByRangeStatusQuery(
                rangeStatus,
                limit || 10,
                direction || 'next',
                cursorPointer && cursorPointer.trim() !== '' ? cursorPointer : undefined
            )
        );
    }

    @Get()
    @ApiOperation({
        summary: 'List collection receipt ranges with pagination',
        description: 'Retrieves a paginated list of all collection receipt ranges',
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
        description: 'Collection receipt ranges retrieved successfully',
    })
    getAll(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        return this.queryBus.execute(
            new GetCollectionReceiptRangesPaginationQuery(
                limit || 10,
                direction || 'next',
                cursorPointer && cursorPointer.trim() !== '' ? cursorPointer : undefined
            )
        );
    }
}

