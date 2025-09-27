import { ErrorResponseDto, ResponseDto, StatusEnum, StockDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StockDatabaseServiceAbstract } from '@stock-database-service';
import { CreateStockCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateStockCommand)
export class CreateStockHandler implements ICommandHandler<CreateStockCommand> {
    protected readonly logger = new Logger(CreateStockHandler.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(command: CreateStockCommand): Promise<ResponseDto<StockDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for stock`);

        try {
            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateStockStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.stockDatabaseService.createRecord(command.stockDto);

            this.logger.log(`Stock created successfully: ${createdRecord.stockId}`);
            return new ResponseDto<StockDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Checks if user has permission to approve updates directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates stock status and activity logs based on user permissions
     */
    private updateStockStatus(command: CreateStockCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.stockDto.status = StatusEnum.ACTIVE;
            command.stockDto.activityLogs = [];
            command.stockDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Stock created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );

            // Limit activity logs to last 10 entries
            command.stockDto.activityLogs = reduceArrayContents(command.stockDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - set to NEW_RECORD
            command.stockDto.status = StatusEnum.NEW_RECORD;
            command.stockDto.activityLogs = [];
            command.stockDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Stock created by ${command.user.username} for approval`
            );

            // Limit activity logs to last 10 entries
            command.stockDto.activityLogs = reduceArrayContents(command.stockDto.activityLogs, ACTIVITY_LOGS_LIMIT);
            command.stockDto.forApprovalVersion = {};
            command.stockDto.forApprovalVersion.productName = command.stockDto.productName;
            command.stockDto.forApprovalVersion.lotNo = command.stockDto.lotNo;
            command.stockDto.forApprovalVersion.quantity = command.stockDto.quantity;
            command.stockDto.forApprovalVersion.productUnitId = command.stockDto.productUnitId;
            command.stockDto.forApprovalVersion.productUnitName = command.stockDto.productUnitName;
            command.stockDto.forApprovalVersion.expirationDate = command.stockDto.expirationDate;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error processing create request for stock:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
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

        return 'An unexpected error occurred';
    }
}
