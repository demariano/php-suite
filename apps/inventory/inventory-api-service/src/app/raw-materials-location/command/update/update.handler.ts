import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    RawMaterialsLocationDto,
    RawMaterialsLocationEventDto,
    RawMaterialsLocationEventEnum,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialsLocationDatabaseServiceAbstract } from '@inventory-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateRawMaterialsLocationCommand } from './update.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateRawMaterialsLocationCommand)
export class UpdateRawMaterialsLocationHandler implements ICommandHandler<UpdateRawMaterialsLocationCommand> {
    protected readonly logger = new Logger(UpdateRawMaterialsLocationHandler.name);

    constructor(
        @Inject('RawMaterialsLocationDatabaseService')
        private readonly rawMaterialsLocationDatabaseService: RawMaterialsLocationDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(
        command: UpdateRawMaterialsLocationCommand
    ): Promise<ResponseDto<RawMaterialsLocationDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialsLocationDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw materials location not found for ID: ${command.recordId}`);
        }

        const oldRawMaterialsLocationName = existing.rawMaterialsLocationName;
        const approveDirect = this.hasApprovalPermission(command.user);
        this.applyUpdates(existing, command.rawMaterialsLocationDto, command.user, approveDirect);

        try {
            const updated = await this.rawMaterialsLocationDatabaseService.updateRecord(existing);

            if (
                approveDirect &&
                oldRawMaterialsLocationName !== command.rawMaterialsLocationDto.rawMaterialsLocationName
            ) {
                await this.publishRawMaterialsLocationUpdatedEvent(
                    existing.rawMaterialsLocationId,
                    command.rawMaterialsLocationDto.rawMaterialsLocationName
                );
            }

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

    private async publishRawMaterialsLocationUpdatedEvent(
        rawMaterialsLocationId: string,
        newRawMaterialsLocationName: string
    ): Promise<void> {
        try {
            const eventDto: RawMaterialsLocationEventDto = {
                rawMaterialsLocationId,
                newRawMaterialsLocationName,
                eventType: RawMaterialsLocationEventEnum.RAW_MATERIALS_LOCATION_UPDATED,
                timestamp: new Date().toISOString(),
            };

            const inventoryQueueUrl = this.configService.get<string>('INVENTORY_EVENT_SQS');
            if (!inventoryQueueUrl) {
                this.logger.error('INVENTORY_EVENT_SQS queue URL not configured');
                return;
            }

            await this.messageQueueService.sendMessageToSQS(inventoryQueueUrl, JSON.stringify(eventDto));
            this.logger.log(
                `Published RAW_MATERIALS_LOCATION_UPDATED event for rawMaterialsLocationId: ${rawMaterialsLocationId}`
            );
        } catch (error) {
            this.logger.error(
                `Failed to publish RAW_MATERIALS_LOCATION_UPDATED event for rawMaterialsLocationId: ${rawMaterialsLocationId}`,
                error
            );
        }
    }
}
