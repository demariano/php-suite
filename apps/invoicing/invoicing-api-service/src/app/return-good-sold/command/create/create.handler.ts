import { CreateReturnGoodSoldDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { ReturnGoodSoldDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateReturnGoodSoldCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateReturnGoodSoldCommand)
export class CreateReturnGoodSoldHandler implements ICommandHandler<CreateReturnGoodSoldCommand> {
    protected readonly logger = new Logger(CreateReturnGoodSoldHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
    ) {}

    async execute(
        command: CreateReturnGoodSoldCommand
    ): Promise<ResponseDto<CreateReturnGoodSoldDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for return good sold: ${command.returnGoodSoldDto.rgsDocno}`);

        try {
            // Update status and activity logs based on permissions
            this.updateReturnGoodSoldStatus(command);

            // Create record in database
            const createdRecord = await this.returnGoodSoldDatabaseService.createRecord(command.returnGoodSoldDto);

            this.logger.log(`Return Good Sold created successfully: ${createdRecord.returnGoodSoldId}`);
            return new ResponseDto<CreateReturnGoodSoldDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.returnGoodSoldDto.rgsDocno);
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
     * Updates return good sold status and activity logs based on user permissions
     */
    private updateReturnGoodSoldStatus(command: CreateReturnGoodSoldCommand): void {
        // Check user authorization and determine status
        const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.returnGoodSoldDto.status = StatusEnum.ACTIVE;
            command.returnGoodSoldDto.activityLogs = [];
            command.returnGoodSoldDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Return Good Sold created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to NEW_RECORD
            command.returnGoodSoldDto.status = StatusEnum.NEW_RECORD;
            command.returnGoodSoldDto.activityLogs = [];
            command.returnGoodSoldDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Return Good Sold created by ${command.user.username} for approval`
            );
            command.returnGoodSoldDto.forApprovalVersion = {};
            command.returnGoodSoldDto.forApprovalVersion.invoiceId = command.returnGoodSoldDto.invoiceId;
            command.returnGoodSoldDto.forApprovalVersion.customerId = command.returnGoodSoldDto.customerId;
            command.returnGoodSoldDto.forApprovalVersion.customerName = command.returnGoodSoldDto.customerName;
            command.returnGoodSoldDto.forApprovalVersion.invoiceDocno = command.returnGoodSoldDto.invoiceDocno;
            command.returnGoodSoldDto.forApprovalVersion.rgsDocno = command.returnGoodSoldDto.rgsDocno;
            command.returnGoodSoldDto.forApprovalVersion.dateReturned = command.returnGoodSoldDto.dateReturned;
            command.returnGoodSoldDto.forApprovalVersion.changeReason = command.returnGoodSoldDto.changeReason;
            command.returnGoodSoldDto.forApprovalVersion.originalInvoiceDetails =
                command.returnGoodSoldDto.originalInvoiceDetails;
            command.returnGoodSoldDto.forApprovalVersion.modifiedInvoiceDetails =
                command.returnGoodSoldDto.modifiedInvoiceDetails;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, rgsDocno: string): never {
        this.logger.error(`Error processing create request for ${rgsDocno}:`, error);

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
    }
}
