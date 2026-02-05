import { ErrorResponseDto, ResponseDto, StatusEnum, StockDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { StockDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConvertStockCommand } from './convert.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

interface ConvertStockResult {
    sourceStock: StockDto;
    destinationStock: StockDto;
    isNewDestination: boolean;
}

@CommandHandler(ConvertStockCommand)
export class ConvertStockHandler implements ICommandHandler<ConvertStockCommand> {
    protected readonly logger = new Logger(ConvertStockHandler.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(command: ConvertStockCommand): Promise<ResponseDto<ConvertStockResult | ErrorResponseDto>> {
        this.logger.log(`Processing convert request for stock: ${command.stockId}`);

        try {
            // Validate user has permission
            this.validateUserPermission(command.user.roles);

            // Get source stock
            const sourceStock = await this.getAndValidateSourceStock(command);

            // Check if destination stock exists
            const existingDestinationStock = await this.findDestinationStock(sourceStock, command);

            // Perform the conversion
            const result = await this.performConversion(sourceStock, existingDestinationStock, command);

            this.logger.log(
                `Stock conversion completed successfully. Source: ${result.sourceStock.stockId}, Destination: ${result.destinationStock.stockId}`
            );
            return new ResponseDto<ConvertStockResult>(result, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Validates user has permission to perform stock conversion
     */
    private validateUserPermission(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new BadRequestException('User does not have permission to convert stock');
        }

        const hasPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasPermission) {
            throw new BadRequestException(
                'User does not have permission to convert stock. Admin or Super Admin role required.'
            );
        }
    }

    /**
     * Gets and validates the source stock
     */
    private async getAndValidateSourceStock(command: ConvertStockCommand): Promise<StockDto> {
        const sourceStock = await this.stockDatabaseService.findRecordById(command.stockId);

        if (!sourceStock) {
            throw new BadRequestException(`Source stock not found: ${command.stockId}`);
        }

        if (sourceStock.status !== StatusEnum.ACTIVE) {
            throw new BadRequestException(`Source stock is not active. Current status: ${sourceStock.status}`);
        }

        // Validate deduct quantity
        const currentQty = sourceStock.totalQuantity || 0;
        if (command.convertStockDto.deductQuantity <= 0) {
            throw new BadRequestException('Deduct quantity must be greater than 0');
        }

        if (command.convertStockDto.deductQuantity > currentQty) {
            throw new BadRequestException(
                `Insufficient quantity. Available: ${currentQty}, Requested: ${command.convertStockDto.deductQuantity}`
            );
        }

        // Validate source and target units are different
        if (sourceStock.productUnitId === command.convertStockDto.targetUnitId) {
            throw new BadRequestException('Source and destination unit must be different');
        }

        // Validate add quantity
        if (command.convertStockDto.addQuantity <= 0) {
            throw new BadRequestException('Add quantity must be greater than 0');
        }

        return sourceStock;
    }

    /**
     * Finds the destination stock if it exists
     */
    private async findDestinationStock(sourceStock: StockDto, command: ConvertStockCommand): Promise<StockDto | null> {
        if (!sourceStock.productId || !sourceStock.lotNo) {
            throw new BadRequestException('Source stock is missing productId or lotNo');
        }

        return await this.stockDatabaseService.findStockByProductUnitAndLot(
            StatusEnum.ACTIVE,
            sourceStock.productId,
            command.convertStockDto.targetUnitId,
            sourceStock.lotNo
        );
    }

    /**
     * Performs the stock conversion
     */
    private async performConversion(
        sourceStock: StockDto,
        existingDestinationStock: StockDto | null,
        command: ConvertStockCommand
    ): Promise<ConvertStockResult> {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        const username = command.user.username;
        const { deductQuantity, addQuantity, targetUnitId, targetUnitName } = command.convertStockDto;

        // Update source stock - deduct quantity
        const updatedSourceStock = await this.updateSourceStock(
            sourceStock,
            deductQuantity,
            targetUnitName,
            addQuantity,
            timestamp,
            username
        );

        let destinationStock: StockDto;
        let isNewDestination: boolean;

        if (existingDestinationStock) {
            // Update existing destination stock
            destinationStock = await this.updateDestinationStock(
                existingDestinationStock,
                addQuantity,
                sourceStock.productUnitName || '',
                deductQuantity,
                timestamp,
                username
            );
            isNewDestination = false;
        } else {
            // Create new destination stock
            destinationStock = await this.createDestinationStock(
                sourceStock,
                targetUnitId,
                targetUnitName,
                addQuantity,
                deductQuantity,
                timestamp,
                username
            );
            isNewDestination = true;
        }

        return {
            sourceStock: updatedSourceStock,
            destinationStock,
            isNewDestination,
        };
    }

    /**
     * Updates the source stock by deducting quantity
     */
    private async updateSourceStock(
        sourceStock: StockDto,
        deductQuantity: number,
        targetUnitName: string,
        addQuantity: number,
        timestamp: string,
        username: string
    ): Promise<StockDto> {
        const currentQty = sourceStock.totalQuantity || 0;
        sourceStock.totalQuantity = currentQty - deductQuantity;

        // Add activity log
        const activityLog = `Date: ${timestamp}, Stock converted by ${username}: Deducted ${deductQuantity} ${sourceStock.productUnitName} -> ${addQuantity} ${targetUnitName}`;
        sourceStock.activityLogs = sourceStock.activityLogs || [];
        sourceStock.activityLogs.push(activityLog);
        sourceStock.activityLogs = reduceArrayContents(sourceStock.activityLogs, ACTIVITY_LOGS_LIMIT);

        return await this.stockDatabaseService.updateRecord(sourceStock);
    }

    /**
     * Updates an existing destination stock by adding quantity
     */
    private async updateDestinationStock(
        destinationStock: StockDto,
        addQuantity: number,
        sourceUnitName: string,
        sourceDeductQty: number,
        timestamp: string,
        username: string
    ): Promise<StockDto> {
        const currentQty = destinationStock.totalQuantity || 0;
        destinationStock.totalQuantity = currentQty + addQuantity;

        // Add activity log
        const activityLog = `Date: ${timestamp}, Stock received from conversion by ${username}: Added ${addQuantity} ${destinationStock.productUnitName} (from ${sourceDeductQty} ${sourceUnitName})`;
        destinationStock.activityLogs = destinationStock.activityLogs || [];
        destinationStock.activityLogs.push(activityLog);
        destinationStock.activityLogs = reduceArrayContents(destinationStock.activityLogs, ACTIVITY_LOGS_LIMIT);

        return await this.stockDatabaseService.updateRecord(destinationStock);
    }

    /**
     * Creates a new destination stock record
     */
    private async createDestinationStock(
        sourceStock: StockDto,
        targetUnitId: string,
        targetUnitName: string,
        addQuantity: number,
        sourceDeductQty: number,
        timestamp: string,
        username: string
    ): Promise<StockDto> {
        const newStock = {
            status: StatusEnum.ACTIVE,
            lotNo: sourceStock.lotNo,
            productId: sourceStock.productId,
            productName: sourceStock.productName,
            totalQuantity: addQuantity,
            productUnitId: targetUnitId,
            productUnitName: targetUnitName,
            expirationDate: sourceStock.expirationDate,
            stockTypeId: sourceStock.stockTypeId,
            stockTypeName: sourceStock.stockTypeName,
            activityLogs: [
                `Date: ${timestamp}, Stock created from conversion by ${username}: ${addQuantity} ${targetUnitName} (from ${sourceDeductQty} ${sourceStock.productUnitName})`,
            ],
            forApprovalVersion: {},
        };

        return await this.stockDatabaseService.createRecord(newStock);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error processing convert request for stock:`, error);

        if (error instanceof BadRequestException) {
            throw error;
        }

        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(errorMessage);
    }

    /**
     * Extracts error message from various error types
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'object' && error !== null && 'response' in error) {
            const responseError = error as { response?: { body?: { errorMessage?: string } } };
            return responseError.response?.body?.errorMessage || 'Unknown error occurred';
        }

        return 'An unexpected error occurred during stock conversion';
    }
}
