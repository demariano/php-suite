import { DynamoDbLibService, UserSchema } from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { } from <Model>DatabaseServiceAbstract;
} from './<modle>-database-service-abstract-class';

@Injectable()
export class <Model>DatabaseService implements <Model>DatabaseServiceAbstract {

    protected readonly logger = new Logger(<Model>DatabaseService.name);

    private readonly <Model>Table: Model<<Model>DataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_<SCHEMANAME>_TABLE = configService.get<string>('DYNAMO_DB_<SCHEMANAME>_TABLE');
        if (!DYNAMO_DB_<SCHEMANAME>_TABLE) {
            throw new Error('DYNAMO_DB_<SCHEMANAME>_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.<Model>Table = dynamoDbService.dynamoDbMainTable(DYNAMO_DB_<SCHEMANAME>_TABLE, UserSchema).getModel('<Model>');
    }

    async createRecord(data: CreateModelDto): Promise<ModelDto> {
     

        const record: <Model>DataType = await this.userTable.create(data);

        return await this.convertToDto(record);
    };

    async updaterRecord(data: <Model>Dto): Promise<<Model>Dto> {


        this.logger.log(`Updating <Model> record with data: ${JSON.stringify(data)}`);

        
        const record: <Model>DataType = await this.<Model>Table.update(record);

        this.logger.log(`Record updated: ${JSON.stringify(record)}`);

        return await this.convertToDto(record);


    }

    

    async deleteUserRecord(data: <Model>Dto): Promise<<Model>Dto> {
        this.logger.log(`deleting  record with id: ${data.<ModelId>}`);

      

        await this.<Model>Table.remove(data);

        this.logger.log(`Record deleted: ${JSON.stringify(data)}`);

        return await this.convertToDto(data);
    }

    async findRecordById(id: string): Promise<<Model>Dto | null> {


        const record = await this.getDatabaseRecordById(id);

        this.logger.log(`Record returned: ${JSON.stringify(record)}`);

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }


    async getDatabaseRecordById(id: string): Promise<<Model>DataType | undefined> {

        const dbStats = {};

        const record: <Model>DataType | undefined = await this.<Model>Table.get({
            PK: '<PKNAME>',
            SK: `${id}`
        });


        this.logger.log(`Record returned: ${JSON.stringify(record)}`);

        this.logger.log(`<Model> Table Find By Id Query stats: ${JSON.stringify(dbStats)}`);

        return record;
    }



    


    async convertToDtoList(entities: <Model>DataType[]): Promise<<Model>Dto[]> {
        return Promise.all(entities.map(this.convertToDto));
    }


    async convertToDto(record: <Model>DataType): Promise<<Model>Dto> {
        const dto = {
            ...record,
        }
        return dto;
    }



}
