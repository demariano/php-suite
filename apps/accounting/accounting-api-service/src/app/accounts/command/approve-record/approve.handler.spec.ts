import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import { AccountTypeEnum, AccountsDto, StatusEnum } from '@dto';
import { ApproveAccountsCommand } from './approve.command';
import { ApproveAccountsHandler } from './approve.handler';

describe('ApproveAccountsHandler', () => {
    let handler: ApproveAccountsHandler;
    let databaseService: jest.Mocked<AccountsDatabaseServiceAbstract>;

    const user = { username: 'admin', roles: ['ADMIN'] } as any;

    beforeEach(() => {
        databaseService = {
            findRecordById: jest.fn(),
            updateRecord: jest.fn(),
            deleteRecord: jest.fn(),
        } as unknown as jest.Mocked<AccountsDatabaseServiceAbstract>;

        handler = new ApproveAccountsHandler(databaseService);
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

    it('resets changeReason and hard deletes when status is FOR_DELETION', async () => {
        const deletionRecord: AccountsDto = {
            accountingId: 'acc-2',
            accountName: 'Delete Me',
            accountType: AccountTypeEnum.AREA,
            status: StatusEnum.FOR_DELETION,
            activityLogs: [],
            subAccounts: [],
            changeReason: 'User requested deletion',
        };

        databaseService.findRecordById.mockResolvedValue(deletionRecord);
        databaseService.deleteRecord.mockImplementation(async (record) => record);

        await handler.execute(new ApproveAccountsCommand('acc-2', user));

        expect(databaseService.deleteRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                changeReason: null,
            })
        );
    });
});

