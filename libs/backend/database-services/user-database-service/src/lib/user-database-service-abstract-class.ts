import { CreateUserDto, PageDto, UserFilterDto, UsersDto } from '@dto';

export abstract class UserDatabaseServiceAbstract {

    abstract createRecord(userDto: CreateUserDto): Promise<UsersDto>;

    abstract findUserRecordById(id: string): Promise<UsersDto | null>;

    abstract updateUserRecord(userData: UsersDto): Promise<UsersDto>;

    abstract findUserRecordByEmail(email: string): Promise<UsersDto | null>;

    abstract findUserRecordsPagination(limit: number, direction: string, cursorPointer: string): Promise<PageDto<UsersDto>>;

    abstract findUserRecordsByFilterPagination(filter: UserFilterDto, limit: number, direction: string, cursorPointer: string): Promise<PageDto<UsersDto>>;

    abstract softDeleteUserRecord(userDto: UsersDto): Promise<UsersDto>;

    abstract hardDeleteUserRecord(userDto: UsersDto): Promise<UsersDto>;

    abstract convertToDto(record: UsersDto): Promise<UsersDto>

    abstract convertToDtoList(records: UsersDto[]): Promise<UsersDto[]>

}
