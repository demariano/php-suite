import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    RawMaterialUnitDto,
    RawMaterialUnitEventDto,
    RawMaterialUnitEventEnum,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialUnitDatabaseServiceAbstract } from '@inventory-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateRawMaterialUnitCommand } from './update.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateRawMaterialUnitCommand)
export class UpdateRawMaterialUnitHandler implements ICommandHandler<UpdateRawMaterialUnitCommand> {
    protected readonly logger = new Logger(UpdateRawMaterialUnitHandler.name);

    constructor(
        @Inject('RawMaterialUnitDatabaseService')
        private readonly rawMaterialUnitDatabaseService: RawMaterialUnitDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: UpdateRawMaterialUnitCommand): Promise<ResponseDto<RawMaterialUnitDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialUnitDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw material unit not found for ID: ${command.recordId}`);
        }

        const oldRawMaterialUnitName = existing.rawMaterialUnitName;
        const approveDirect = this.hasApprovalPermission(command.user);
        this.applyUpdates(existing, command.rawMaterialUnitDto, command.user, approveDirect);

        try {
            const updated = await this.rawMaterialUnitDatabaseService.updateRecord(existing);

            if (approveDirect && oldRawMaterialUnitName !== command.rawMaterialUnitDto.rawMaterialUnitName) {
                await this.publishRawMaterialUnitUpdatedEvent(
                    existing.rawMaterialUnitId,
                    command.rawMaterialUnitDto.rawMaterialUnitName
                );
            }

            return new ResponseDto<RawMaterialUnitDto>(updated, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to update raw material unit', error as Error);
            throw new BadRequestException('Failed to update raw material unit');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private applyUpdates(
        existing: RawMaterialUnitDto,
        payload: RawMaterialUnitDto,
        user: UserCognito,
        approveDirect: boolean
    ): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs = existing.activityLogs || [];

        if (approveDirect) {
            existing.rawMaterialUnitName = payload.rawMaterialUnitName ?? existing.rawMaterialUnitName;
            existing.status = StatusEnum.ACTIVE;
            existing.activityLogs.push(
                `Date: ${timestamp}, Raw material unit updated by ${user.username}, status set to ACTIVE`
            );
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
            existing.forApprovalVersion = {};
            existing.changeReason = undefined;
        } else {
            existing.status = StatusEnum.FOR_APPROVAL;
            existing.forApprovalVersion = {
                rawMaterialUnitName: payload.rawMaterialUnitName ?? existing.rawMaterialUnitName,
            } as Record<string, unknown>;
            existing.changeReason = payload.changeReason;
            existing.activityLogs.push(
                `Date: ${timestamp}, Raw material unit update requested by ${user.username} for approval`
            );
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
        }
    }

    private async publishRawMaterialUnitUpdatedEvent(
        rawMaterialUnitId: string,
        newRawMaterialUnitName: string
    ): Promise<void> {
        try {
            const eventDto: RawMaterialUnitEventDto = {
                rawMaterialUnitId,
                newRawMaterialUnitName,
                eventType: RawMaterialUnitEventEnum.RAW_MATERIAL_UNIT_UPDATED,
                timestamp: new Date().toISOString(),
            };

            const inventoryQueueUrl = this.configService.get<string>('INVENTORY_EVENT_SQS');
            if (!inventoryQueueUrl) {
                this.logger.error('INVENTORY_EVENT_SQS queue URL not configured');
                return;
            }

            await this.messageQueueService.sendMessageToSQS(inventoryQueueUrl, JSON.stringify(eventDto));
            this.logger.log(`Published RAW_MATERIAL_UNIT_UPDATED event for rawMaterialUnitId: ${rawMaterialUnitId}`);
        } catch (error) {
            this.logger.error(
                `Failed to publish RAW_MATERIAL_UNIT_UPDATED event for rawMaterialUnitId: ${rawMaterialUnitId}`,
                error
            );
        }
    }
}
