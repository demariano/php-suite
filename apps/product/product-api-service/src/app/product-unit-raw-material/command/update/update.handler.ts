import { ErrorResponseDto, ProductUnitRawMaterialDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductUnitRawMaterialDatabaseServiceAbstract } from '@product-database-service';
import { UpdateProductUnitRawMaterialCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateProductUnitRawMaterialCommand)
export class UpdateProductUnitRawMaterialHandler implements ICommandHandler<UpdateProductUnitRawMaterialCommand> {
    protected readonly logger = new Logger(UpdateProductUnitRawMaterialHandler.name);

    constructor(
        @Inject('ProductUnitRawMaterialDatabaseService')
        private readonly productUnitRawMaterialDatabaseService: ProductUnitRawMaterialDatabaseServiceAbstract
    ) {}

    async execute(
        command: UpdateProductUnitRawMaterialCommand
    ): Promise<ResponseDto<ProductUnitRawMaterialDto | ErrorResponseDto>> {
        this.logger.log(
            `Processing update request for product unit raw material: ${command.productUnitRawMaterialDto.productUnitRawMaterialId}`
        );

        try {
            command.productUnitRawMaterialDto.productUnitRawMaterialId = command.productUnitRawMaterialId;

            // Validate record exists
            const existingRecord = await this.validateProductUnitRawMaterialExists(command.productUnitRawMaterialId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateProductUnitRawMaterialStatus(existingRecord, command, hasApprovalPermission);

            // Optimize activity logs
            existingRecord.activityLogs =
                reduceArrayContents(existingRecord.activityLogs ?? [], ACTIVITY_LOGS_LIMIT) ?? [];

            // Update record in database
            const updatedRecord = await this.productUnitRawMaterialDatabaseService.updateRecord(existingRecord);

            this.logger.log(
                `Product unit raw material updated successfully: ${existingRecord.productUnitRawMaterialId}`
            );
            return new ResponseDto<ProductUnitRawMaterialDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.productUnitRawMaterialDto.productUnitRawMaterialId);
        }
    }

    /**
     * Validates that the product unit raw material record exists
     */
    private async validateProductUnitRawMaterialExists(
        productUnitRawMaterialId: string
    ): Promise<ProductUnitRawMaterialDto> {
        const existingRecord = await this.productUnitRawMaterialDatabaseService.findRecordById(
            productUnitRawMaterialId
        );

        if (!existingRecord) {
            this.logger.warn(`Product unit raw material not found: ${productUnitRawMaterialId}`);
            throw new NotFoundException(
                `Product unit raw material record not found for id ${productUnitRawMaterialId}`
            );
        }

        if (existingRecord.status == StatusEnum.FOR_DELETION || existingRecord.status == StatusEnum.FOR_APPROVAL) {
            throw new BadRequestException('Product unit raw material is already for deletion or approval');
        }

        return existingRecord;
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
     * Updates product unit raw material status and activity logs based on user permissions
     */
    private updateProductUnitRawMaterialStatus(
        existingRecord: ProductUnitRawMaterialDto,
        command: UpdateProductUnitRawMaterialCommand,
        hasApprovalPermission: boolean
    ): void {
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];

        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.productId = command.productUnitRawMaterialDto.productId;
            existingRecord.productName = command.productUnitRawMaterialDto.productName;
            existingRecord.rawMaterialsPerUnit = command.productUnitRawMaterialDto.rawMaterialsPerUnit ?? [];

            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product unit raw material updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
            existingRecord.forApprovalVersion = {};
            existingRecord.changeReason = undefined;
        } else {
            // User needs approval - set to FOR_APPROVAL
            existingRecord.status = StatusEnum.FOR_APPROVAL;

            // Detect changes
            const fieldChanges = detectFieldChanges(existingRecord, command.productUnitRawMaterialDto, {
                arrayIdFields: {
                    rawMaterialsPerUnit: 'productUnitId',
                },
            });

            const formattedChanges = formatFieldChanges(fieldChanges);
            const trimmedReason = command.productUnitRawMaterialDto.changeReason?.trim();

            //set the forApprovalVersion
            existingRecord.forApprovalVersion = {
                productId: command.productUnitRawMaterialDto.productId,
                productName: command.productUnitRawMaterialDto.productName,
                rawMaterialsPerUnit: command.productUnitRawMaterialDto.rawMaterialsPerUnit,
            };

            const combinedReason = [trimmedReason, formattedChanges]
                .filter((value) => value && value.length > 0)
                .join('\n\n');

            existingRecord.changeReason = combinedReason || undefined;

            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Product unit raw material updated by ${command.user.username} for approval`;

            if (formattedChanges) {
                activityLogMessage += `\nChanges: ${formattedChanges}`;
            }

            existingRecord.activityLogs.push(activityLogMessage);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, productUnitRawMaterialId: string): never {
        this.logger.error(`Error processing update request for ${productUnitRawMaterialId}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
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
