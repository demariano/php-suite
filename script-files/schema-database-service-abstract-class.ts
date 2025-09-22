import { PageDto } from '@dto';

export abstract class DatabaseServiceAbstract {

    abstract createRecord(userDto: <CreateModelDto>): Promise<ModelDto>;

    abstract findUserRecordById(id: string): Promise<ModelDto | null>;

    abstract updateRecord(data: ModelDto): Promise<ModelDto>;

    abstract findRecordsPagination(limit: number, direction: string, cursorPointer: string): Promise<PageDto<ModelDto>>;

    abstract deleteRecord(userDto: ModelDto): Promise<ModelDto>;

    abstract convertToDto(record: ModelDto): Promise<ModelDto>

    abstract convertToDtoList(records: ModelDto[]): Promise<ModelDto[]>

}
