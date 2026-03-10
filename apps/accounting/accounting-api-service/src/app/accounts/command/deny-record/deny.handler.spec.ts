import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import { AccountTypeEnum, AccountsDto, StatusEnum } from '@dto';
import { DenyAccountsCommand } from './deny.command';
import { DenyAccountsHandler } from './deny.handler';

describe('DenyAccountsHandler', () => {
    let handler: DenyAccountsHandler;
    let databaseService: jest.Mocked<AccountsDatabaseServiceAbstract>;
    const user = { username: 'approver', roles: ['ADMIN'] } as any;

    beforeEach(() => {
        databaseService = {
            findRecordById: jest.fn(),
            updateRecord: jest.fn(),
            deleteRecord: jest.fn(),
        } as unknown as jest.Mocked<AccountsDatabaseServiceAbstract>;

        handler = new DenyAccountsHandler(databaseService);
    });

    it('reverts FOR_APPROVAL records to ACTIVE and clears pending changes', async () => {
        const pendingRecord: AccountsDto = {
            accountingId: 'acc-10',
            accountName: 'Pending',
            accountType: AccountTypeEnum.AREA,
            status: StatusEnum.FOR_APPROVAL,
            activityLogs: [],
            subAccounts: [],
            changeReason: 'Needs approval',
            forApprovalVersion: {
                accountName: 'Pending Updated',
            },
        };

        databaseService.findRecordById.mockResolvedValue(pendingRecord);
        databaseService.updateRecord.mockImplementation(async (record) => record);

        const response = await handler.execute(new DenyAccountsCommand('acc-10', user, 'Denied for review'));

        expect(databaseService.updateRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                status: StatusEnum.ACTIVE,
                forApprovalVersion: {},
                changeReason: null,
            })
        );
        const payload = response.body as AccountsDto;
        expect(payload.status).toBe(StatusEnum.ACTIVE);
    });

    it('reverts FOR_DEACTIVATION records back to ACTIVE', async () => {
        const deactivationRecord: AccountsDto = {
            accountingId: 'acc-20',
            accountName: 'Deactivation Candidate',
            accountType: AccountTypeEnum.AREA,
            status: StatusEnum.FOR_DEACTIVATION,
            activityLogs: [],
            subAccounts: [],
            changeReason: 'Deactivate please',
        };

        databaseService.findRecordById.mockResolvedValue(deactivationRecord);
        databaseService.updateRecord.mockImplementation(async (record) => record);

        await handler.execute(new DenyAccountsCommand('acc-20', user, 'Denied deactivation'));

        expect(databaseService.updateRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                status: StatusEnum.ACTIVE,
                changeReason: null,
            })
        );
    });
});
