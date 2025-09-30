import { CreateTermsDto, PageDto, TermsDto } from '@dto';

export abstract class TermsDatabaseServiceAbstract {
    abstract createRecord(termsDto: CreateTermsDto): Promise<TermsDto>;

    abstract findRecordById(id: string): Promise<TermsDto | null>;

    abstract findRecordContainingName(name: string): Promise<TermsDto[] | null>;

    abstract findRecordByName(name: string): Promise<TermsDto | null>;

    abstract updateRecord(termsData: TermsDto): Promise<TermsDto>;

    abstract findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<TermsDto>>;

    abstract deleteRecord(termsDto: TermsDto): Promise<TermsDto>;

    abstract convertToDto(record: TermsDto): Promise<TermsDto>;

    abstract convertToDtoList(records: TermsDto[]): Promise<TermsDto[]>;

    abstract deleteAllRecords(): Promise<void>;
}
