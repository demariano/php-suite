import { Injectable, Logger } from '@nestjs/common';
import { VoucherDatabaseService } from '@php/accounting-database-service';
import { AccountEventDto, VoucherDto } from '@php/dto';

@Injectable()
export class AccountSyncHandlerService {
    private readonly logger = new Logger(AccountSyncHandlerService.name);

    constructor(private readonly voucherDatabaseService: VoucherDatabaseService) {}

    async handleAccountUpdatedEvent(event: AccountEventDto): Promise<void> {
        this.logger.log(`Processing account updated event: ${JSON.stringify(event)}`);

        try {
            await this.syncAccountNameToVouchers(event.accountingId, event.newAccountName);
            this.logger.log(`Successfully synced account name for accountingId: ${event.accountingId}`);
        } catch (error) {
            this.logger.error(`Error syncing account name: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async syncAccountNameToVouchers(accountingId: string, newAccountName: string): Promise<void> {
        let hasMoreRecords = true;
        let cursorPointer = '';
        const limit = 100;

        while (hasMoreRecords) {
            const pageDto = await this.voucherDatabaseService.findRecordsByAccountIdPagination(
                limit,
                accountingId,
                'forward',
                cursorPointer
            );

            if (pageDto.data && pageDto.data.length > 0) {
                const updatedRecords: VoucherDto[] = pageDto.data.map((record) => {
                    record.accountName = newAccountName;
                    if (record.forApprovalVersion && typeof record.forApprovalVersion === 'object') {
                        record.forApprovalVersion.accountName = newAccountName;
                    }
                    return record;
                });

                await this.voucherDatabaseService.batchUpdate(updatedRecords);
                this.logger.log(`Updated ${updatedRecords.length} voucher records for accountingId: ${accountingId}`);
            }

            if (pageDto.nextCursorPointer) {
                cursorPointer = pageDto.nextCursorPointer;
            } else {
                hasMoreRecords = false;
            }
        }
    }
}
