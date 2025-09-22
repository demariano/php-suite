import { ConfigurationDto, CreateConfigurationDto, PageDto } from '@dto';

export abstract class ConfigurationDatabaseServiceAbstract {

    abstract createRecord(userDto: CreateConfigurationDto): Promise<ConfigurationDto>;

    abstract findRecordById(id: string): Promise<ConfigurationDto | null>;

    abstract findRecordByName(name: string): Promise<ConfigurationDto | null>;

    abstract updateRecord(configurationData: ConfigurationDto): Promise<ConfigurationDto>;

    abstract findRecordsPagination(limit: number, direction: string, cursorPointer: string): Promise<PageDto<ConfigurationDto>>;


    abstract hardDeleteRecord(userDto: ConfigurationDto): Promise<ConfigurationDto>;

    abstract convertToDto(record: ConfigurationDto): Promise<ConfigurationDto>

    abstract convertToDtoList(records: ConfigurationDto[]): Promise<ConfigurationDto[]>

}
