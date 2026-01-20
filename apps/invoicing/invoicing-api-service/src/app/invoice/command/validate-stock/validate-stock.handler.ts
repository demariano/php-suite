import { ErrorResponseDto, ResponseDto } from '@dto';
import { StockDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ValidateStockCommand } from './validate-stock.command';

const HTTP_STATUS_OK = 200;

interface InvalidStockItem {
    stockId: string;
    stockName: string;
    productName: string;
    requested: number;
    available: number;
}

interface ValidationResult {
    valid: boolean;
    invalidItems: InvalidStockItem[];
}

@CommandHandler(ValidateStockCommand)
export class ValidateStockHandler implements ICommandHandler<ValidateStockCommand> {
    protected readonly logger = new Logger(ValidateStockHandler.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(command: ValidateStockCommand): Promise<ResponseDto<ValidationResult | ErrorResponseDto>> {
        this.logger.log(`Validating stock for ${command.invoiceDetails.length} invoice items`);

        try {
            const invalidItems: InvalidStockItem[] = [];

            for (const detail of command.invoiceDetails) {
                if (!detail.stockId) {
                    continue; // Skip items without stockId
                }

                // Fetch current stock record
                const stockRecord = await this.stockDatabaseService.findRecordById(detail.stockId);

                if (!stockRecord) {
                    this.logger.warn(`Stock not found for stockId: ${detail.stockId}`);
                    invalidItems.push({
                        stockId: detail.stockId,
                        stockName: detail.lotNo || 'Unknown',
                        productName: detail.productName || 'Unknown',
                        requested: detail.qty || 0,
                        available: 0,
                    });
                    continue;
                }

                // Check if sufficient stock is available
                const totalRequested = detail.qty || 0;
                const currentAvailable = stockRecord.totalQuantity || 0;

                if (currentAvailable < totalRequested) {
                    invalidItems.push({
                        stockId: detail.stockId,
                        stockName: stockRecord.lotNo || 'Unknown',
                        productName: stockRecord.productName || 'Unknown',
                        requested: totalRequested,
                        available: currentAvailable,
                    });
                }
            }

            const result: ValidationResult = {
                valid: invalidItems.length === 0,
                invalidItems,
            };

            this.logger.log(
                `Stock validation complete: ${result.valid ? 'Valid' : `Invalid (${invalidItems.length} items)`}`
            );
            return new ResponseDto<ValidationResult>(result, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error('Error validating stock:', error);

        if (error instanceof BadRequestException) {
            throw error;
        }

        const errorMessage =
            error instanceof Error ? error.message : 'An unexpected error occurred during stock validation';
        throw new BadRequestException(errorMessage);
    }
}
