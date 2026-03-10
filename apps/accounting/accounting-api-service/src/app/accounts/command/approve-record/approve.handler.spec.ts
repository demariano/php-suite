import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import { AccountTypeEnum, AccountsDto, StatusEnum } from '@dto';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { ConfigService } from '@nestjs/config';
import { ApproveAccountsCommand } from './approve.command';
import { ApproveAccountsHandler } from './approve.handler';

describe('ApproveAccountsHandler', () => {
    let handler: ApproveAccountsHandler;
    let databaseService: jest.Mocked<AccountsDatabaseServiceAbstract>;
    let messageQueueService: jest.Mocked<MessageQueueServiceAbstract>;
    let configService: jest.Mocked<ConfigService>;

    const user = { username: 'admin', roles: ['ADMIN'] } as any;

    beforeEach(() => {
        databaseService = {
            findRecordById: jest.fn(),
            updateRecord: jest.fn(),
            deleteRecord: jest.fn(),
        } as unknown as jest.Mocked<AccountsDatabaseServiceAbstract>;

        messageQueueService = {
            sendMessageToSQS: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<MessageQueueServiceAbstract>;

        configService = {
            get: jest.fn().mockReturnValue('http://localhost:4566/queue/ACCOUNTING_EVENT_SQS'),
        } as unknown as jest.Mocked<ConfigService>;

        handler = new ApproveAccountsHandler(databaseService, messageQueueService, configService);
    });

    it('applies forApprovalVersion, resets changeReason, and persists the record', async () => {
        const pendingRecord: AccountsDto = {
            accountingId: 'acc-1',
            accountName: 'Old Account',
            accountType: AccountTypeEnum.AREA,
            status: StatusEnum.FOR_APPROVAL,
            activityLogs: [],
            subAccounts: ['sub-a'],
            changeReason: 'Needs review',
            forApprovalVersion: {
                accountName: 'New Account',
                accountType: AccountTypeEnum.CUSTOMER,
                subAccounts: ['sub-b'],
            },
        };

        databaseService.findRecordById.mockResolvedValue(pendingRecord);
        databaseService.updateRecord.mockImplementation(async (record) => record);

        const response = await handler.execute(new ApproveAccountsCommand('acc-1', user));

        expect(databaseService.updateRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                accountName: 'New Account',
                accountType: AccountTypeEnum.CUSTOMER,
                status: StatusEnum.ACTIVE,
                changeReason: null,
                forApprovalVersion: {},
            })
        );
        const payload = response.body as AccountsDto;
        expect(payload.status).toBe(StatusEnum.ACTIVE);
    });

    it('approves deactivation when status is FOR_DEACTIVATION', async () => {
        const deactivationRecord: AccountsDto = {
            accountingId: 'acc-2',
            accountName: 'Deactivate Me',
            accountType: AccountTypeEnum.AREA,
            status: StatusEnum.FOR_DEACTIVATION,
            activityLogs: [],
            subAccounts: [],
            changeReason: 'User requested deactivation',
        };

        databaseService.findRecordById.mockResolvedValue(deactivationRecord);
        databaseService.updateRecord.mockImplementation(async (record) => record);

        const response = await handler.execute(new ApproveAccountsCommand('acc-2', user));

        expect(databaseService.updateRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                status: StatusEnum.INACTIVE,
                changeReason: null,
            })
        );
        const payload = response.body as AccountsDto;
        expect(payload.status).toBe(StatusEnum.INACTIVE);
    });
});
