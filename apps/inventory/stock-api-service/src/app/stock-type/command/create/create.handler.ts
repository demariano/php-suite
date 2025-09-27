import { ErrorResponseDto, ResponseDto, StatusEnum, StockTypeDto, UserRole } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StockTypeDatabaseServiceAbstract } from '@stock-database-service';
import { CreateStockTypeCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateStockTypeCommand)
export class CreateStockTypeHandler implements ICommandHandler<CreateStockTypeCommand> {
    protected readonly logger = new Logger(CreateStockTypeHandler.name);

    constructor(
        @Inject('StockTypeDatabaseService')
        private readonly stockTypeDatabaseService: StockTypeDatabaseServiceAbstract
    ) {}

    async execute(command: CreateStockTypeCommand): Promise<ResponseDto<StockTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for stock type: ${command.stockTypeDto.stockTypeName}`);

        try {
            // Validate that stock type name doesn't already exist
            await this.validateStockTypeNameUnique(command.stockTypeDto.stockTypeName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateStockTypeStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.stockTypeDatabaseService.createRecord(command.stockTypeDto);

            this.logger.log(`Stock type created successfully: ${createdRecord.stockTypeId}`);
            return new ResponseDto<StockTypeDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.stockTypeDto.stockTypeName);
        }
    }

    /**
     * Validates that the stock type name is unique
     */
    private async validateStockTypeNameUnique(stockTypeName: string): Promise<void> {
        const existingRecord = await this.stockTypeDatabaseService.findRecordByName(stockTypeName);

        if (existingRecord) {
            this.logger.warn(`Stock type name already exists: ${stockTypeName}`);
            throw new BadRequestException('Stock type name already exists');
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
     * Updates stock type status and activity logs based on user permissions
     */
    private updateStockTypeStatus(command: CreateStockTypeCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.stockTypeDto.status = StatusEnum.ACTIVE;
            command.stockTypeDto.activityLogs = [];
            command.stockTypeDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Stock type created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );

            // Limit activity logs to last 10 entries
            command.stockTypeDto.activityLogs = reduceArrayContents(
                command.stockTypeDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
        } else {
            // User needs approval - set to NEW_RECORD
            command.stockTypeDto.status = StatusEnum.NEW_RECORD;
            command.stockTypeDto.activityLogs = [];
            command.stockTypeDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Stock type created by ${command.user.username} for approval`
            );

            // Limit activity logs to last 10 entries
            command.stockTypeDto.activityLogs = reduceArrayContents(
                command.stockTypeDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
            command.stockTypeDto.forApprovalVersion = {};
            command.stockTypeDto.forApprovalVersion.stockTypeName = command.stockTypeDto.stockTypeName;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, stockTypeName: string): never {
        this.logger.error(`Error processing create request for ${stockTypeName}:`, error);

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
