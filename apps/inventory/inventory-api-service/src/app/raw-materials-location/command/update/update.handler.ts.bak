import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialsLocationDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialsLocationDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateRawMaterialsLocationCommand } from './update.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateRawMaterialsLocationCommand)
export class UpdateRawMaterialsLocationHandler implements ICommandHandler<UpdateRawMaterialsLocationCommand> {
    protected readonly logger = new Logger(UpdateRawMaterialsLocationHandler.name);

    constructor(
        @Inject('RawMaterialsLocationDatabaseService')
        private readonly rawMaterialsLocationDatabaseService: RawMaterialsLocationDatabaseServiceAbstract
    ) {}

    async execute(
        command: UpdateRawMaterialsLocationCommand
    ): Promise<ResponseDto<RawMaterialsLocationDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialsLocationDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw materials location not found for ID: ${command.recordId}`);
        }

        const approveDirect = this.hasApprovalPermission(command.user);
        this.applyUpdates(existing, command.rawMaterialsLocationDto, command.user, approveDirect);

        try {
            const updated = await this.rawMaterialsLocationDatabaseService.updateRecord(existing);
            return new ResponseDto<RawMaterialsLocationDto>(updated, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to update raw materials location', error as Error);
            throw new BadRequestException('Failed to update raw materials location');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private applyUpdates(
        existing: RawMaterialsLocationDto,
        payload: RawMaterialsLocationDto,
        user: UserCognito,
        approveDirect: boolean
    ): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs = existing.activityLogs || [];

        if (approveDirect) {
            existing.rawMaterialsLocationName = payload.rawMaterialsLocationName ?? existing.rawMaterialsLocationName;
            existing.status = StatusEnum.ACTIVE;
            existing.activityLogs.push(
                `Date: ${timestamp}, Raw materials location updated by ${user.username}, status set to ACTIVE`
            );
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
            existing.forApprovalVersion = {};
            existing.changeReason = undefined;
        } else {
            existing.status = StatusEnum.FOR_APPROVAL;
            existing.forApprovalVersion = {
                rawMaterialsLocationName: payload.rawMaterialsLocationName ?? existing.rawMaterialsLocationName,
            } as Record<string, unknown>;
            existing.changeReason = payload.changeReason;
            existing.activityLogs.push(
                `Date: ${timestamp}, Raw materials location update requested by ${user.username} for approval`
            );
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
        }
    }
}
