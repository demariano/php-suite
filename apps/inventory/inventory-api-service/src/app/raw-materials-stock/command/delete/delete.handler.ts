import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialsStockDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialsStockDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteRawMaterialsStockCommand } from './delete.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteRawMaterialsStockCommand)
export class DeleteRawMaterialsStockHandler implements ICommandHandler<DeleteRawMaterialsStockCommand> {
    protected readonly logger = new Logger(DeleteRawMaterialsStockHandler.name);

    constructor(
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async execute(
        command: DeleteRawMaterialsStockCommand
    ): Promise<ResponseDto<RawMaterialsStockDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialsStockDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw materials stock not found for ID: ${command.recordId}`);
        }

        const approveDirect = this.hasApprovalPermission(command.user);
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs = existing.activityLogs || [];
        existing.activityLogs.push(
            approveDirect
                ? `Date: ${timestamp}, Raw materials stock deleted by ${command.user.username}`
                : `Date: ${timestamp}, Raw materials stock marked for deletion by ${command.user.username}`
        );
        existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
        existing.status = StatusEnum.FOR_DELETION;

        try {
            const result = approveDirect
                ? await this.rawMaterialsStockDatabaseService.deleteRecord(existing)
                : await this.rawMaterialsStockDatabaseService.updateRecord(existing);
            return new ResponseDto<RawMaterialsStockDto>(result, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to delete raw materials stock', error as Error);
            throw new BadRequestException('Failed to delete raw materials stock');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }
}
