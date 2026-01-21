import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialUnitDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialUnitDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteRawMaterialUnitCommand } from './delete.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteRawMaterialUnitCommand)
export class DeleteRawMaterialUnitHandler implements ICommandHandler<DeleteRawMaterialUnitCommand> {
    protected readonly logger = new Logger(DeleteRawMaterialUnitHandler.name);

    constructor(
        @Inject('RawMaterialUnitDatabaseService')
        private readonly rawMaterialUnitDatabaseService: RawMaterialUnitDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteRawMaterialUnitCommand): Promise<ResponseDto<RawMaterialUnitDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialUnitDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw material unit not found for ID: ${command.recordId}`);
        }

        const approveDirect = this.hasApprovalPermission(command.user);
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs = existing.activityLogs || [];
        existing.activityLogs.push(
            approveDirect
                ? `Date: ${timestamp}, Raw material unit deleted by ${command.user.username}`
                : `Date: ${timestamp}, Raw material unit marked for deletion by ${command.user.username}`
        );
        existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
        existing.status = StatusEnum.FOR_DEACTIVATION;

        try {
            const result = approveDirect
                ? await this.rawMaterialUnitDatabaseService.deleteRecord(existing)
                : await this.rawMaterialUnitDatabaseService.updateRecord(existing);
            return new ResponseDto<RawMaterialUnitDto>(result, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to delete raw material unit', error as Error);
            throw new BadRequestException('Failed to delete raw material unit');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }
}
