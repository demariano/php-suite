import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    RawMaterialsPurchaseOrderDto,
    RawMaterialsPurchaseOrderStatusEnum,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialsPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateRawMaterialsPurchaseOrderCommand } from './create.command';

const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateRawMaterialsPurchaseOrderCommand)
export class CreateRawMaterialsPurchaseOrderHandler implements ICommandHandler<CreateRawMaterialsPurchaseOrderCommand> {
    protected readonly logger = new Logger(CreateRawMaterialsPurchaseOrderHandler.name);

    constructor(
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(
        command: CreateRawMaterialsPurchaseOrderCommand
    ): Promise<ResponseDto<RawMaterialsPurchaseOrderDto | ErrorResponseDto>> {
        this.logger.log(
            `Creating raw materials purchase order for supplier: ${command.rawMaterialsPurchaseOrderDto.rawMaterialSupplierName}`
        );

        const hasApprovalPermission = this.hasApprovalPermission(command.user);
        this.prepareStatusAndAudit(command.rawMaterialsPurchaseOrderDto, command.user, hasApprovalPermission);

        try {
            const created = await this.rawMaterialsPurchaseOrderDatabaseService.createRecord(
                command.rawMaterialsPurchaseOrderDto
            );
            return new ResponseDto<RawMaterialsPurchaseOrderDto>(created, HTTP_STATUS_CREATED);
        } catch (error) {
            this.logger.error('Failed to create raw materials purchase order', error as Error);
            throw new BadRequestException('Failed to create raw materials purchase order');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private prepareStatusAndAudit(dto: RawMaterialsPurchaseOrderDto, user: UserCognito, approveDirect: boolean): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        dto.activityLogs = dto.activityLogs || [];
        dto.poStatus = dto.poStatus || RawMaterialsPurchaseOrderStatusEnum.PENDING;

        if (approveDirect) {
            dto.status = StatusEnum.ACTIVE;
            dto.activityLogs.push(
                `Date: ${timestamp}, Raw materials purchase order created by ${user.username}, status set to ACTIVE`
            );
            dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            dto.changeReason = undefined;
        } else {
            dto.status = StatusEnum.NEW_RECORD;
            dto.activityLogs.push(
                `Date: ${timestamp}, Raw materials purchase order created by ${user.username} for approval`
            );
            dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
            dto.forApprovalVersion = {
                poStatus: dto.poStatus,
                rawMaterialSupplierId: dto.rawMaterialSupplierId,
                rawMaterialSupplierName: dto.rawMaterialSupplierName,
                poDate: dto.poDate,
                purchaseOrderDetails: dto.purchaseOrderDetails,
                deliveredPurchaseOrderDetails: dto.deliveredPurchaseOrderDetails,
            } as Record<string, unknown>;
        }
    }
}
