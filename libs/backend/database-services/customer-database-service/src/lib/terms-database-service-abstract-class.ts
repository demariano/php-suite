import { CreateTermsDto, PageDto, TermsDto } from '@dto';

export abstract class TermsDatabaseServiceAbstract {
    abstract createRecord(termsDto: CreateTermsDto): Promise<TermsDto>;

    abstract findRecordById(id: string): Promise<TermsDto | null>;

    abstract findRecordContainingName(
        limit: number,
        name: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<TermsDto>>;

    abstract findRecordByName(name: string): Promise<TermsDto | null>;

    abstract updateRecord(termsData: TermsDto): Promise<TermsDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<TermsDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<TermsDto>>;

    abstract deleteRecord(termsDto: TermsDto): Promise<TermsDto>;

    abstract convertToDto(record: TermsDto): Promise<TermsDto>;

    abstract convertToDtoList(records: TermsDto[]): Promise<TermsDto[]>;

    abstract deleteAllRecords(): Promise<void>;
}
