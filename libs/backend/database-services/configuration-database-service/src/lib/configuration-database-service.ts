import { ConfigurationDto, CreateConfigurationDto, PageDto } from '@dto';
import { ConfigurationDataType, ConfigurationSchema, DynamoDbLibService, createDynamoDbOptionWithPKSKIndex, pageRecordHandler } from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { ConfigurationDatabaseServiceAbstract } from './configuration-database-service-abstract-class';

@Injectable()
export class ConfigurationDatabaseService implements ConfigurationDatabaseServiceAbstract {

    protected readonly logger = new Logger(ConfigurationDatabaseService.name);

    private readonly configurationTable: Model<ConfigurationDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_CONFIGURATION_TABLE = configService.get<string>('DYNAMO_DB_CONFIGURATION_TABLE');
        if (!DYNAMO_DB_CONFIGURATION_TABLE) {
            throw new Error('DYNAMO_DB_CONFIGURATION_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.configurationTable = dynamoDbService.dynamoDbMainTable(DYNAMO_DB_CONFIGURATION_TABLE, ConfigurationSchema).getModel('Configuration');
    }

    async createRecord(configurationDto: CreateConfigurationDto): Promise<ConfigurationDto> {
        const configurationData: ConfigurationDataType = {
            configurationName: configurationDto.configurationName,
            configurationValue: configurationDto.configurationValue,
            GSI1PK: `CONFIGURATION}`,
            GSI1SK: configurationDto.configurationName,
        };

        const configurationRecord: ConfigurationDataType = await this.configurationTable.create(configurationData);

        return await this.convertToDto(configurationRecord);
    };

    async updateRecord(configurationData: ConfigurationDto): Promise<ConfigurationDto> {


        this.logger.log(`Updating configuration record with configurationData: ${JSON.stringify(configurationData)}`);

        const configurationDataType: ConfigurationDataType = {
            configurationName: configurationData.configurationName,
            configurationValue: configurationData.configurationValue,
            GSI1PK: `CONFIGURATION}`,
            GSI1SK: configurationData.configurationName,
        };


        const updatedRecord: ConfigurationDataType = await this.configurationTable.update(configurationDataType);

        this.logger.log(`Configuration Record updated: ${JSON.stringify(updatedRecord)}`);

        return await this.convertToDto(updatedRecord);


    }


    async hardDeleteRecord(configurationData: ConfigurationDto): Promise<ConfigurationDto> {

        this.logger.log(`Hard deleting configuration record with configurationId: ${configurationData.configurationId}`);


        await this.configurationTable.remove(configurationData);

        this.logger.log(`Configuration Record hard deleted: ${JSON.stringify(configurationData)}`);

        return configurationData;
    }

    async findRecordById(configurationId: string): Promise<ConfigurationDto | null> {



        const configurationRecord = await this.getDatabaseRecordById(configurationId);

        this.logger.log(`Configuration Record returned: ${JSON.stringify(configurationRecord)}`);



        if (!configurationRecord) {
            return null;
        }

        return await this.convertToDto(configurationRecord);
    }


    async getDatabaseRecordById(configurationId: string): Promise<ConfigurationDataType | undefined> {

        const dbStats = {};

        const configurationRecord: ConfigurationDataType | undefined = await this.configurationTable.get({
            PK: 'CONFIGURATION',
            SK: `${configurationId}`
        }, {
            stats: dbStats,
        });


        this.logger.log(`Configuration Record returned: ${JSON.stringify(configurationRecord)}`);

        this.logger.log(`Configuration Table Find By Id Query stats: ${JSON.stringify(dbStats)}`);

        return configurationRecord;
    }

    async findRecordByName(configurationName: string): Promise<ConfigurationDto | null> {
        const dbStats = {};


        const configurationRecord: ConfigurationDataType[] | undefined = await this.configurationTable.find(
            {
                GSI1PK: `CONFIGURATION`,
                GSI1SK: configurationName
            }, {
            index: 'GSI1',
            stats: dbStats,
        });



        this.logger.log(`Configuration Record returned: ${JSON.stringify(configurationRecord)}`);

        this.logger.log(`Configuration Table Find By Name Query stats: ${JSON.stringify(dbStats)}`);

        //check if there is no user record found 
        if (configurationRecord.length === 0) {
            return null
        }

        return await this.convertToDto(configurationRecord[0]);
    }




    async findRecordsPagination(limit: number, direction: string, cursorPointer: string): Promise<PageDto<ConfigurationDto>> {

        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(
            limit,
            'GSI1',
            direction,
            cursorPointer
        );
        const dbStats = {};


        dynamoDbOption['stats'] = dbStats;
        const configurationRecords = await this.configurationTable.find(
            {
                GSI1PK: 'CONFIGURATION',
            } as ConfigurationDataType,
            dynamoDbOption,
        );


        this.logger.log(`Record Returned length: ${configurationRecords.length}`);


        const pageRecordCursorPointers = pageRecordHandler(configurationRecords, limit, direction, 'GSI1PK', 'GSI1SK', 'PK', 'SK', JSON.stringify(configurationRecords.next), JSON.stringify(configurationRecords.prev));

        return new PageDto(
            await this.convertToDtoList(configurationRecords),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );


    }

    async convertToDtoList(records: ConfigurationDataType[]): Promise<ConfigurationDto[]> {
        const dtoList: ConfigurationDto[] = [];

        for (const record of records) {
            const dto: ConfigurationDto = await this.convertToDto(record);
            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDto(record: ConfigurationDataType): Promise<ConfigurationDto> {
        const dto = new ConfigurationDto();
        dto.configurationId = record.configurationId ? record.configurationId : '';
        dto.configurationName = record.configurationName ? record.configurationName : '';
        dto.configurationValue = record.configurationValue ? record.configurationValue : '';

        return dto;
    }




}
