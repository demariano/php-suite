import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    ResponseDto,
    StatusEnum,
    StockPurchaseOrderDto,
    StockPurchaseOrderStatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { StockPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateStockPurchaseOrderCommand } from './create.command';

const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateStockPurchaseOrderCommand)
export class CreateStockPurchaseOrderHandler implements ICommandHandler<CreateStockPurchaseOrderCommand> {
    protected readonly logger = new Logger(CreateStockPurchaseOrderHandler.name);

    constructor(
        @Inject('StockPurchaseOrderDatabaseService')
        private readonly stockPurchaseOrderDatabaseService: StockPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(
        command: CreateStockPurchaseOrderCommand
    ): Promise<ResponseDto<StockPurchaseOrderDto | ErrorResponseDto>> {
        this.logger.log(
            `Creating stock purchase order for supplier: ${command.stockPurchaseOrderDto.supplierName}`
        );

        const hasApprovalPermission = this.hasApprovalPermission(command.user);
        this.prepareStatusAndAudit(command.stockPurchaseOrderDto, command.user, hasApprovalPermission);

        // Check for duplicate docNo
        const existingRecord = await this.stockPurchaseOrderDatabaseService.findRecordByDocNo(
            command.stockPurchaseOrderDto.docNo!
        );
        if (existingRecord) {
            throw new BadRequestException(
                `Purchase order with document number '${command.stockPurchaseOrderDto.docNo}' already exists`
            );
        }

        try {
            const created = await this.stockPurchaseOrderDatabaseService.createRecord(
                command.stockPurchaseOrderDto
            );
            return new ResponseDto<StockPurchaseOrderDto>(created, HTTP_STATUS_CREATED);
        } catch (error) {
            this.logger.error('Failed to create stock purchase order', error as Error);
            throw new BadRequestException('Failed to create stock purchase order');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private prepareStatusAndAudit(dto: StockPurchaseOrderDto, user: UserCognito, approveDirect: boolean): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        dto.activityLogs = dto.activityLogs || [];
        dto.poStatus = dto.poStatus || StockPurchaseOrderStatusEnum.PENDING;

        if (approveDirect) {
            dto.status = StatusEnum.ACTIVE;
            dto.activityLogs.push(
                `Date: ${timestamp}, Stock purchase order created by ${user.username}, status set to ACTIVE`
            );
            dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            dto.changeReason = undefined;
        } else {
            dto.status = StatusEnum.NEW_RECORD;
            dto.activityLogs.push(
                `Date: ${timestamp}, Stock purchase order created by ${user.username} for approval`
            );
            dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            dto.forApprovalVersion = {
                poStatus: dto.poStatus,
                supplierId: dto.supplierId,
                supplierName: dto.supplierName,
                poDate: dto.poDate,
                docNo: dto.docNo,
                purchaseOrderDetails: dto.purchaseOrderDetails,
                deliveredPurchaseOrderDetails: dto.deliveredPurchaseOrderDetails,
            } as Record<string, unknown>;
        }
    }
}
