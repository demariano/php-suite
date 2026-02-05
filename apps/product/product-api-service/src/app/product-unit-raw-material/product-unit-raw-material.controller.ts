import { CognitoAuthGuard, CurrentUser, UserCognito } from '@auth-guard-lib';
import { CreateProductUnitRawMaterialDto, ProductUnitRawMaterialDto } from '@dto';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApproveProductUnitRawMaterialCommand } from './command/approve-record/approve.command';
import { CreateProductUnitRawMaterialCommand } from './command/create/create.command';
import { DeleteProductUnitRawMaterialCommand } from './command/delete/delete.command';
import { DenyProductUnitRawMaterialCommand } from './command/deny-record/deny.command';
import { DenyProductUnitRawMaterialDto } from './command/deny-record/deny.dto';
import { UpdateProductUnitRawMaterialCommand } from './command/update/update.command';
import { GetProductUnitRawMaterialByIdQuery } from './queries/get.by.id/get.product.unit.raw.material.by.id.query';
import { GetProductUnitRawMaterialByProductIdQuery } from './queries/get.by.product.id/get.product.unit.raw.material.by.product.id.query';
import { GetProductUnitRawMaterialRecordsByProductNamePaginationQuery } from './queries/get.records.by.product.name.pagination/get.records.by.product.name.pagination.query';
import { GetProductUnitRawMaterialRecordsByProductPaginationQuery } from './queries/get.records.by.product.pagination/get.records.by.product.pagination.query';
import { GetProductUnitRawMaterialRecordsByStatusPaginationQuery } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.query';
import { GetProductUnitRawMaterialRecordsPaginationQuery } from './queries/get.records.pagination/get.records.pagination.query';

@Controller('product-unit-raw-materials')
@ApiTags('product-unit-raw-materials')
@ApiBearerAuth('JWT-auth')
@UseGuards(CognitoAuthGuard)
export class ProductUnitRawMaterialController {
    constructor(private readonly queryBus: QueryBus, private readonly commandBus: CommandBus) {}

    @Post()
    @ApiOperation({
        summary: 'Create new product unit raw material',
        description: 'Creates a new product unit raw material configuration with the provided information.',
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
        description: 'Product unit raw material successfully created',
        type: ProductUnitRawMaterialDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Product already has raw material configuration or validation failed',
    })
    @ApiBody({
        type: CreateProductUnitRawMaterialDto,
        description: 'Product unit raw material creation payload',
    })
    createRecord(
        @Body() productUnitRawMaterialDto: CreateProductUnitRawMaterialDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new CreateProductUnitRawMaterialCommand(productUnitRawMaterialDto, user);
        return this.commandBus.execute(command);
    }
    @Get()
    @ApiOperation({
        summary: 'Get product unit raw materials with pagination',
        description:
            'Retrieves product unit raw materials with pagination support. Supports optional status and productName filtering.',
    })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: true,
        description: 'Number of records per page (1-100)',
        example: 10,
    })
    @ApiQuery({
        name: 'direction',
        type: String,
        required: false,
        description: 'Pagination direction (forward or backward)',
        example: 'forward',
    })
    @ApiQuery({
        name: 'cursorPointer',
        type: String,
        required: false,
        description: 'Cursor for pagination',
    })
    @ApiQuery({
        name: 'status',
        type: String,
        required: false,
        description: 'Filter by status (e.g., ACTIVE, FOR_APPROVAL)',
        enum: ['ACTIVE', 'INACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD', 'DRAFT'],
        example: 'ACTIVE',
    })
    @ApiQuery({
        name: 'productName',
        type: String,
        required: false,
        description: 'Filter by product name (partial match)',
        example: 'Widget',
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
        description: 'Product unit raw materials successfully retrieved',
    })
    getRecordsPagination(
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('status') status: string,
        @Query('productName') productName: string,
        @Query('userRole') userRole: string
    ) {
        const query = new GetProductUnitRawMaterialRecordsPaginationQuery(
            limit,
            direction,
            cursorPointer,
            status,
            productName
        );
        return this.queryBus.execute(query);
    }

    @Get('name/:productName')
    @ApiOperation({
        summary: 'Get product unit raw materials by product name with pagination',
        description: 'Search and retrieve product unit raw materials by product name with pagination support.',
    })
    @ApiParam({
        name: 'productName',
        type: String,
        required: true,
        description: 'Product name to search for',
        example: 'Widget',
    })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: true,
        description: 'Number of records per page (1-100)',
        example: 10,
    })
    @ApiQuery({
        name: 'direction',
        type: String,
        required: false,
        description: 'Pagination direction',
        example: 'next',
    })
    @ApiQuery({
        name: 'cursorPointer',
        type: String,
        required: false,
        description: 'Cursor for pagination',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'USER',
    })
    @ApiResponse({
        status: 200,
        description: 'Product unit raw materials successfully retrieved',
    })
    getRecordsByProductName(
        @Param('productName') productName: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string,
        @Query('userRole') userRole: string
    ) {
        const query = new GetProductUnitRawMaterialRecordsByProductNamePaginationQuery(
            limit,
            productName,
            direction,
            cursorPointer
        );
        return this.queryBus.execute(query);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get product unit raw material by ID',
        description: 'Retrieves a product unit raw material configuration by its unique identifier.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product unit raw material ID',
        example: 'purm_123456789',
    })
    @ApiResponse({
        status: 200,
        description: 'Product unit raw material successfully retrieved',
        type: ProductUnitRawMaterialDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product unit raw material not found',
    })
    getRecordById(@Param('id') id: string) {
        const query = new GetProductUnitRawMaterialByIdQuery(id);
        return this.queryBus.execute(query);
    }

    @Get('product/:productId')
    @ApiOperation({
        summary: 'Get product unit raw material by product ID',
        description: 'Retrieves the raw material configuration for a specific product.',
    })
    @ApiParam({
        name: 'productId',
        description: 'Product ID',
        example: 'prod_123456789',
    })
    @ApiResponse({
        status: 200,
        description: 'Product unit raw material successfully retrieved',
        type: ProductUnitRawMaterialDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product unit raw material not found for this product',
    })
    getRecordByProductId(@Param('productId') productId: string) {
        const query = new GetProductUnitRawMaterialByProductIdQuery(productId);
        return this.queryBus.execute(query);
    }

    @Get('product/:productId/pagination')
    @ApiOperation({
        summary: 'Get product unit raw materials by product with pagination',
        description: 'Retrieves product unit raw materials for a specific product with pagination support.',
    })
    @ApiParam({
        name: 'productId',
        description: 'Product ID',
        example: 'prod_123456789',
    })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: false,
        description: 'Number of records per page',
        example: 10,
    })
    @ApiQuery({
        name: 'direction',
        type: String,
        required: false,
        description: 'Pagination direction (forward or backward)',
        example: 'forward',
    })
    @ApiQuery({
        name: 'cursorPointer',
        type: String,
        required: false,
        description: 'Cursor for pagination',
    })
    @ApiResponse({
        status: 200,
        description: 'Product unit raw materials successfully retrieved',
    })
    getRecordsByProductPagination(
        @Param('productId') productId: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        const query = new GetProductUnitRawMaterialRecordsByProductPaginationQuery(
            limit,
            productId,
            direction,
            cursorPointer
        );
        return this.queryBus.execute(query);
    }

    @Get('status/:status/product/:productId/pagination')
    @ApiOperation({
        summary: 'Get product unit raw materials by status and product with pagination',
        description: 'Retrieves product unit raw materials filtered by status and product with pagination support.',
    })
    @ApiParam({
        name: 'status',
        description: 'Product unit raw material status',
        example: 'ACTIVE',
        enum: ['ACTIVE', 'FOR_APPROVAL', 'FOR_DELETION', 'NEW_RECORD', 'DRAFT'],
    })
    @ApiParam({
        name: 'productId',
        description: 'Product ID',
        example: 'prod_123456789',
    })
    @ApiQuery({
        name: 'limit',
        type: Number,
        required: false,
        description: 'Number of records per page',
        example: 10,
    })
    @ApiQuery({
        name: 'direction',
        type: String,
        required: false,
        description: 'Pagination direction (forward or backward)',
        example: 'forward',
    })
    @ApiQuery({
        name: 'cursorPointer',
        type: String,
        required: false,
        description: 'Cursor for pagination',
    })
    @ApiResponse({
        status: 200,
        description: 'Product unit raw materials successfully retrieved',
    })
    getRecordsByStatusPagination(
        @Param('status') status: string,
        @Param('productId') productId: string,
        @Query('limit') limit: number,
        @Query('direction') direction: string,
        @Query('cursorPointer') cursorPointer: string
    ) {
        const query = new GetProductUnitRawMaterialRecordsByStatusPaginationQuery(
            limit,
            status,
            productId,
            direction,
            cursorPointer
        );
        return this.queryBus.execute(query);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update product unit raw material',
        description: 'Updates an existing product unit raw material configuration.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product unit raw material ID',
        example: 'purm_123456789',
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
        description: 'Product unit raw material successfully updated',
        type: ProductUnitRawMaterialDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Product unit raw material not found or validation failed',
    })
    @ApiResponse({
        status: 404,
        description: 'Product unit raw material not found',
    })
    @ApiBody({
        type: ProductUnitRawMaterialDto,
        description: 'Product unit raw material update payload',
    })
    updateRecord(
        @Param('id') id: string,
        @Body() productUnitRawMaterialDto: ProductUnitRawMaterialDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new UpdateProductUnitRawMaterialCommand(id, productUnitRawMaterialDto, user);
        return this.commandBus.execute(command);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete product unit raw material',
        description:
            'Deletes a product unit raw material configuration from the system. Requires appropriate permissions.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product unit raw material ID',
        example: 'purm_123456789',
    })
    @ApiQuery({
        name: 'userRole',
        type: String,
        required: false,
        description: 'Override user role for testing purposes (only works when BYPASS_AUTH=ENABLED)',
        enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        example: 'ADMIN',
    })
    @ApiQuery({
        name: 'changeReason',
        type: String,
        required: false,
        description: 'Reason for deletion (required for non-admin users)',
        example: 'No longer needed',
    })
    @ApiResponse({
        status: 200,
        description: 'Product unit raw material successfully deleted',
        type: ProductUnitRawMaterialDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Product unit raw material not found',
    })
    deleteRecord(
        @Param('id') id: string,
        @Query('userRole') userRole: string,
        @Query('changeReason') changeReason: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new DeleteProductUnitRawMaterialCommand(id, user, changeReason);
        return this.commandBus.execute(command);
    }

    @Post(':id/approve')
    @ApiOperation({
        summary: 'Approve product unit raw material',
        description:
            'Approves a product unit raw material change or deletion request. Requires admin or super admin role.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product unit raw material ID',
        example: 'purm_123456789',
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
        description: 'Product unit raw material successfully approved',
        type: ProductUnitRawMaterialDto,
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Product unit raw material not found',
    })
    approveRecord(@Param('id') id: string, @Query('userRole') userRole: string, @CurrentUser() user: UserCognito) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new ApproveProductUnitRawMaterialCommand(id, user);
        return this.commandBus.execute(command);
    }

    @Post(':id/deny')
    @ApiOperation({
        summary: 'Deny product unit raw material',
        description:
            'Denies a product unit raw material change or deletion request. Requires admin or super admin role.',
    })
    @ApiParam({
        name: 'id',
        description: 'Product unit raw material ID',
        example: 'purm_123456789',
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
        type: DenyProductUnitRawMaterialDto,
        description: 'Deny reason details',
    })
    @ApiResponse({
        status: 200,
        description: 'Product unit raw material successfully denied',
        type: ProductUnitRawMaterialDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid approver message',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Product unit raw material not found',
    })
    denyRecord(
        @Param('id') id: string,
        @Body() denyDto: DenyProductUnitRawMaterialDto,
        @Query('userRole') userRole: string,
        @CurrentUser() user: UserCognito
    ) {
        // Override user roles if userRole query parameter is provided and BYPASS_AUTH is enabled
        if (userRole && process.env['BYPASS_AUTH'] === 'ENABLED') {
            user.roles = [userRole];
        }

        const command = new DenyProductUnitRawMaterialCommand(id, user, denyDto.approverMessage);
        return this.commandBus.execute(command);
    }
}
