import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialSupplierDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialSupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateRawMaterialSupplierCommand } from './update.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateRawMaterialSupplierCommand)
export class UpdateRawMaterialSupplierHandler implements ICommandHandler<UpdateRawMaterialSupplierCommand> {
    protected readonly logger = new Logger(UpdateRawMaterialSupplierHandler.name);

    constructor(
        @Inject('RawMaterialSupplierDatabaseService')
        private readonly rawMaterialSupplierDatabaseService: RawMaterialSupplierDatabaseServiceAbstract
    ) {}

    async execute(
        command: UpdateRawMaterialSupplierCommand
    ): Promise<ResponseDto<RawMaterialSupplierDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialSupplierDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw material supplier not found for ID: ${command.recordId}`);
        }

        const approveDirect = this.hasApprovalPermission(command.user);

        this.applyUpdates(existing, command.rawMaterialSupplierDto, command.user, approveDirect);

        try {
            const updated = await this.rawMaterialSupplierDatabaseService.updateRecord(existing);
            return new ResponseDto<RawMaterialSupplierDto>(updated, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to update raw material supplier', error as Error);
            throw new BadRequestException('Failed to update raw material supplier');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private applyUpdates(
        existing: RawMaterialSupplierDto,
        payload: RawMaterialSupplierDto,
        user: UserCognito,
        approveDirect: boolean
    ): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs = existing.activityLogs || [];

        if (approveDirect) {
            existing.rawMaterialSupplierName = payload.rawMaterialSupplierName ?? existing.rawMaterialSupplierName;
            existing.status = StatusEnum.ACTIVE;
            existing.activityLogs.push(
                `Date: ${timestamp}, Raw material supplier updated by ${user.username}, status set to ACTIVE`
            );
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
            existing.forApprovalVersion = {};
            existing.changeReason = undefined;
        } else {
            existing.status = StatusEnum.FOR_APPROVAL;
            existing.forApprovalVersion = {
                rawMaterialSupplierName: payload.rawMaterialSupplierName ?? existing.rawMaterialSupplierName,
            } as Record<string, unknown>;
            existing.changeReason = payload.changeReason;
            existing.activityLogs.push(
                `Date: ${timestamp}, Raw material supplier update requested by ${user.username} for approval`
            );
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
        }
    }
}
