import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialSupplierDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialSupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteRawMaterialSupplierCommand } from './delete.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteRawMaterialSupplierCommand)
export class DeleteRawMaterialSupplierHandler implements ICommandHandler<DeleteRawMaterialSupplierCommand> {
    protected readonly logger = new Logger(DeleteRawMaterialSupplierHandler.name);

    constructor(
        @Inject('RawMaterialSupplierDatabaseService')
        private readonly rawMaterialSupplierDatabaseService: RawMaterialSupplierDatabaseServiceAbstract
    ) {}

    async execute(
        command: DeleteRawMaterialSupplierCommand
    ): Promise<ResponseDto<RawMaterialSupplierDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialSupplierDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw material supplier not found for ID: ${command.recordId}`);
        }

        const approveDirect = this.hasApprovalPermission(command.user);
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs = existing.activityLogs || [];
        existing.activityLogs.push(
            approveDirect
                ? `Date: ${timestamp}, Raw material supplier deleted by ${command.user.username}`
                : `Date: ${timestamp}, Raw material supplier marked for deletion by ${command.user.username}`
        );
        existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
        existing.status = StatusEnum.FOR_DELETION;

        try {
            const result = approveDirect
                ? await this.rawMaterialSupplierDatabaseService.deleteRecord(existing)
                : await this.rawMaterialSupplierDatabaseService.updateRecord(existing);
            return new ResponseDto<RawMaterialSupplierDto>(result, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to delete raw material supplier', error as Error);
            throw new BadRequestException('Failed to delete raw material supplier');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }
}
