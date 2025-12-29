import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialsStockDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialsStockDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateRawMaterialsStockCommand } from './update.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateRawMaterialsStockCommand)
export class UpdateRawMaterialsStockHandler implements ICommandHandler<UpdateRawMaterialsStockCommand> {
    protected readonly logger = new Logger(UpdateRawMaterialsStockHandler.name);

    constructor(
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async execute(
        command: UpdateRawMaterialsStockCommand
    ): Promise<ResponseDto<RawMaterialsStockDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialsStockDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw materials stock not found for ID: ${command.recordId}`);
        }

        const approveDirect = this.hasApprovalPermission(command.user);
        this.applyUpdates(existing, command.rawMaterialsStockDto, command.user, approveDirect);

        try {
            const updated = await this.rawMaterialsStockDatabaseService.updateRecord(existing);
            return new ResponseDto<RawMaterialsStockDto>(updated, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to update raw materials stock', error as Error);
            throw new BadRequestException('Failed to update raw materials stock');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private applyUpdates(
        existing: RawMaterialsStockDto,
        payload: RawMaterialsStockDto,
        user: UserCognito,
        approveDirect: boolean
    ): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs = existing.activityLogs || [];

        if (approveDirect) {
            existing.rawMaterialId = payload.rawMaterialId ?? existing.rawMaterialId;
            existing.rawMaterialName = payload.rawMaterialName ?? existing.rawMaterialName;
            existing.rawMaterialUnitId = payload.rawMaterialUnitId ?? existing.rawMaterialUnitId;
            existing.rawMaterialUnitName = payload.rawMaterialUnitName ?? existing.rawMaterialUnitName;
            existing.rawMaterialSupplierId = payload.rawMaterialSupplierId ?? existing.rawMaterialSupplierId;
            existing.rawMaterialSupplierName = payload.rawMaterialSupplierName ?? existing.rawMaterialSupplierName;
            existing.rawMaterialsLocationId = payload.rawMaterialsLocationId ?? existing.rawMaterialsLocationId;
            existing.rawMaterialsLocationName = payload.rawMaterialsLocationName ?? existing.rawMaterialsLocationName;
            existing.rawMaterialNamePoNo = payload.rawMaterialNamePoNo ?? existing.rawMaterialNamePoNo;
            existing.qty = payload.qty ?? existing.qty;
            existing.lotNo = payload.lotNo ?? existing.lotNo;
            existing.status = StatusEnum.ACTIVE;
            existing.activityLogs.push(
                `Date: ${timestamp}, Raw materials stock updated by ${user.username}, status set to ACTIVE`
            );
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
            existing.forApprovalVersion = {};
            existing.changeReason = undefined;
        } else {
            existing.status = StatusEnum.FOR_APPROVAL;
            existing.forApprovalVersion = {
                rawMaterialId: payload.rawMaterialId ?? existing.rawMaterialId,
                rawMaterialName: payload.rawMaterialName ?? existing.rawMaterialName,
                rawMaterialUnitId: payload.rawMaterialUnitId ?? existing.rawMaterialUnitId,
                rawMaterialUnitName: payload.rawMaterialUnitName ?? existing.rawMaterialUnitName,
                rawMaterialSupplierId: payload.rawMaterialSupplierId ?? existing.rawMaterialSupplierId,
                rawMaterialSupplierName: payload.rawMaterialSupplierName ?? existing.rawMaterialSupplierName,
                rawMaterialsLocationId: payload.rawMaterialsLocationId ?? existing.rawMaterialsLocationId,
                rawMaterialsLocationName: payload.rawMaterialsLocationName ?? existing.rawMaterialsLocationName,
                rawMaterialNamePoNo: payload.rawMaterialNamePoNo ?? existing.rawMaterialNamePoNo,
                qty: payload.qty ?? existing.qty,
                lotNo: payload.lotNo ?? existing.lotNo,
            } as Record<string, unknown>;
            existing.changeReason = payload.changeReason;
            existing.activityLogs.push(
                `Date: ${timestamp}, Raw materials stock update requested by ${user.username} for approval`
            );
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
        }
    }
}
