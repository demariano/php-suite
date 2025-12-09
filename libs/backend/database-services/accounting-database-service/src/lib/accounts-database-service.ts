import { AccountsDto, AccountTypeEnum, CreateAccountsDto, PageDto, StatusEnum } from '@dto';
import {
    AccountingSchema,
    AccountsDataType,
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    pageRecordHandler,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { AccountsDatabaseServiceAbstract } from './accounts-database-service-abstract-class';

@Injectable()
export class AccountsDatabaseService implements AccountsDatabaseServiceAbstract {
    protected readonly logger = new Logger(AccountsDatabaseService.name);

    private readonly accountsTable: Model<AccountsDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_ACCOUNTING_TABLE = configService.get<string>('DYNAMO_DB_ACCOUNTING_TABLE');
        if (!DYNAMO_DB_ACCOUNTING_TABLE) {
            throw new Error('DYNAMO_DB_ACCOUNTING_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.accountsTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_ACCOUNTING_TABLE, AccountingSchema)
            .getModel('Accounts');
    }
    async createRecord(dto: CreateAccountsDto): Promise<AccountsDto> {
        const normalizedStatus = dto.status ?? StatusEnum.NEW_RECORD;
        const normalizedAccountType = dto.accountType ?? AccountTypeEnum.OTHERS;
        const record = await this.accountsTable.create({
            accountName: dto.accountName,
            accountType: normalizedAccountType,
            subAccounts: dto.subAccounts ?? [],
            status: normalizedStatus,
            activityLogs: dto.activityLogs ?? [],
            changeReason: dto.changeReason,
            forApprovalVersion: dto.forApprovalVersion,
            GSI1PK: 'ACCOUNTS',
            GSI1SK: dto.accountName,
            GSI2PK: `ACCOUNTS#${normalizedStatus}`,
            GSI2SK: dto.accountName,
            GSI3PK: `ACCOUNTS#${normalizedAccountType}`,
            GSI3SK: dto.accountName,
            GSI4PK: `ACCOUNTS#${normalizedAccountType}#${normalizedStatus}`,
            GSI4SK: dto.accountName,
        } as AccountsDataType);
        return await this.convertToDto(record);
    }

    async updateRecord(dto: AccountsDto): Promise<AccountsDto> {
        const accountsRecord: AccountsDataType = await this.convertToDataType(dto);

        accountsRecord.changeReason = dto.changeReason;
        accountsRecord.approverMessage = dto.approverMessage;

        const updatedAccountsRecord: AccountsDataType = await this.accountsTable.update(accountsRecord);
        return await this.convertToDto(updatedAccountsRecord);
    }

    async findRecordById(id: string): Promise<AccountsDto | null> {
        const record = await this.accountsTable.get({
            PK: `ACCOUNTS`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<AccountsDto>> {
        limit = Number(limit);
        const trimmedName = name?.trim();
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const accountsRecords = await this.accountsTable.find(
            {
                GSI1PK: `ACCOUNTS`,
                ...(trimmedName ? { GSI1SK: { begins: trimmedName } } : {}),
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            accountsRecords,
            limit,
            direction,
            'GSI1PK',
            'GSI1SK',
            'PK',
            'SK',
            JSON.stringify(accountsRecords.next),
            JSON.stringify(accountsRecords.prev)
        );

        return new PageDto(
            await this.convertToDtoList(accountsRecords),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async findRecordByName(name: string): Promise<AccountsDto | null> {
        const record = await this.accountsTable.get(
            {
                GSI1PK: `ACCOUNTS`,
                GSI1SK: `${name}`,
            },
            {
                index: 'GSI1',
            }
        );

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async getDatabaseRecordById(recordId: string): Promise<AccountsDataType | undefined> {
        const record: AccountsDataType | undefined = await this.accountsTable.get({
            PK: 'ACCOUNTS',
            SK: `${recordId}`,
        });

        this.logger.log(`Accounts Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<AccountsDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.accountsTable.find(
            {
                GSI1PK: `ACCOUNTS`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI1PK',
            'GSI1SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async findRecordsByAccountTypePagination(
        limit: number,
        accountType: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<AccountsDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI4', direction, cursorPointer);

        const records = await this.accountsTable.find(
            {
                GSI4PK: `ACCOUNTS#${accountType}#ACTIVE`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI4PK',
            'GSI4SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<AccountsDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);
        const trimmedName = name?.trim();
        const records = await this.accountsTable.find(
            {
                GSI2PK: `ACCOUNTS#${status}`,
                ...(trimmedName ? { GSI2SK: { begins: trimmedName } } : {}),
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI2PK',
            'GSI2SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async deleteRecord(dto: AccountsDto): Promise<AccountsDto> {
        const accountsRecord: AccountsDataType = await this.convertToDataType(dto);

        await this.accountsTable.remove(accountsRecord);

        this.logger.log(`Accounts Record hard deleted: ${JSON.stringify(accountsRecord)}`);

        return await this.convertToDto(accountsRecord);
    }

    async deleteAllRecords(): Promise<void> {
        // Get all the records
        const records = await this.accountsTable.find(
            {
                GSI1PK: `ACCOUNTS`,
            },
            {
                index: 'GSI1',
            }
        );

        // Delete each record
        for (const record of records) {
            await this.accountsTable.remove(record);
            this.logger.log(`Accounts Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async convertToDto(record: AccountsDataType): Promise<AccountsDto> {
        const dto = new AccountsDto();
        dto.accountingId = record.accountingId ? record.accountingId : '';
        dto.accountName = record.accountName ? record.accountName : '';
        dto.accountType = record.accountType ? (record.accountType as AccountTypeEnum) : AccountTypeEnum.OTHERS;
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.subAccounts = record.subAccounts ? record.subAccounts : [];
        dto.changeReason = (record as AccountsDataType & { changeReason?: string }).changeReason || undefined;
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : undefined;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;

        return dto;
    }

    async convertToDtoList(records: AccountsDataType[]): Promise<AccountsDto[]> {
        const dtoList: AccountsDto[] = [];
        for (const record of records) {
            const dto = await this.convertToDto(record);
            dtoList.push(dto);
        }
        return dtoList;
    }

    async convertToDataType(dto: AccountsDto): Promise<AccountsDataType> {
        const normalizedStatus = dto.status ?? StatusEnum.ACTIVE;
        const normalizedAccountType = dto.accountType ?? AccountTypeEnum.OTHERS;
        const normalizedAccountName = dto.accountName ?? '';
        const accountsData: AccountsDataType = {
            accountingId: dto.accountingId,
            accountName: normalizedAccountName,
            accountType: normalizedAccountType,
            status: normalizedStatus,
            activityLogs: dto.activityLogs ?? [],
            changeReason: dto.changeReason,
            subAccounts: dto.subAccounts ? dto.subAccounts : [],
            forApprovalVersion: dto.forApprovalVersion,
            approverMessage: dto.approverMessage,
            GSI1PK: `ACCOUNTS`,
            GSI1SK: normalizedAccountName,
            GSI2PK: `ACCOUNTS#${normalizedStatus}`,
            GSI2SK: normalizedAccountName,
            GSI3PK: `ACCOUNTS#${normalizedAccountType}`,
            GSI3SK: normalizedAccountName,
            GSI4PK: `ACCOUNTS#${normalizedAccountType}#${normalizedStatus}`,
            GSI4SK: normalizedAccountName,
        };
        return accountsData;
    }
}
