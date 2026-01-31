import { Injectable, Logger } from '@nestjs/common';

import { VoucherDatabaseService } from '@accounting-database-service';
import { AccountEventDto, VoucherDto } from '@dto';

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
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting account sync for vouchers: accountingId=${accountingId}`);

        try {
            do {
                pageNumber++;
                const direction = cursorPointer ? 'next' : null;

                const pageDto = await this.voucherDatabaseService.findRecordsByAccountIdPagination(
                    limit,
                    accountingId,
                    direction as 'next' | 'prev',
                    cursorPointer
                );

                if (!pageDto.data || pageDto.data.length === 0) {
                    this.logger.log('No more vouchers to process');
                    break;
                }

                this.logger.log(`Processing page ${pageNumber}: ${pageDto.data.length} vouchers`);

                const updatedRecords: VoucherDto[] = pageDto.data.map((record) => ({
                    ...record,
                    accountName: newAccountName,
                    forApprovalVersion: record.forApprovalVersion
                        ? {
                              ...record.forApprovalVersion,
                              accountName: newAccountName,
                          }
                        : undefined,
                }));

                await this.voucherDatabaseService.batchUpdate(updatedRecords);
                totalUpdated += pageDto.data.length;
                cursorPointer = pageDto.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} vouchers for accountingId: ${accountingId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync vouchers for accountingId: ${accountingId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
