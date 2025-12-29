import {
    ErrorResponseDto,
    RawMaterialsPurchaseOrderDto,
    RawMaterialsPurchaseOrderStatusEnum,
    ResponseDto,
    StatusEnum,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialsPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SystemGeneratedToPendingCommand } from './system-generated-to-pending.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(SystemGeneratedToPendingCommand)
export class SystemGeneratedToPendingHandler implements ICommandHandler<SystemGeneratedToPendingCommand> {
    protected readonly logger = new Logger(SystemGeneratedToPendingHandler.name);

    constructor(
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(
        command: SystemGeneratedToPendingCommand
    ): Promise<ResponseDto<RawMaterialsPurchaseOrderDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialsPurchaseOrderDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw materials purchase order not found for ID: ${command.recordId}`);
        }

        if (existing.poStatus !== RawMaterialsPurchaseOrderStatusEnum.SYSTEM_GENERATED) {
            throw new BadRequestException('Only SYSTEM_GENERATED purchase orders can be moved to PENDING');
        }

        existing.poStatus = RawMaterialsPurchaseOrderStatusEnum.PENDING;
        existing.status = existing.status ?? StatusEnum.ACTIVE;
        existing.activityLogs = existing.activityLogs || [];
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs.push(
            `Date: ${timestamp}, PO status changed from SYSTEM_GENERATED to PENDING by ${command.user.username}`
        );
        existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);

        try {
            const updated = await this.rawMaterialsPurchaseOrderDatabaseService.updateRecord(existing);
            return new ResponseDto<RawMaterialsPurchaseOrderDto>(updated, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to move purchase order to PENDING', error as Error);
            throw new BadRequestException('Failed to move purchase order to PENDING');
        }
    }
}
