import { PageDto, ReportDto, ReportFileDetailDto, ReportFilterParams, ReportStatusEnum, ReportTypeEnum } from '@dto';
import { DynamoDbLibService, ReportSchema, ReportsDataType } from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { ReportDatabaseServiceAbstract } from './report-database-service-abstract-class';

function createDynamoDbOptionWithPKSKIndex(limit: number, index: string, direction: string, cursorPointer: string) {
    return {
        limit,
        index,
        reverse: direction === 'prev',
        ...(cursorPointer ? { start: JSON.parse(cursorPointer) } : {}),
    };
}

function pageRecordHandler(
    records: any,
    limit: number,
    direction: string,
    pkField: string,
    skField: string,
    pk: string,
    sk: string,
    next: string,
    prev: string
) {
    return {
        nextCursorPointer: next,
        prevCursorPointer: prev,
    };
}

@Injectable()
export class ReportDatabaseService implements ReportDatabaseServiceAbstract {
    protected readonly logger = new Logger(ReportDatabaseService.name);

    private readonly reportTable: Model<ReportsDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_REPORT_TABLE = configService.get<string>('DYNAMO_DB_REPORT_TABLE');
        if (!DYNAMO_DB_REPORT_TABLE) {
            throw new Error('DYNAMO_DB_REPORT_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.reportTable = dynamoDbService.dynamoDbMainTable(DYNAMO_DB_REPORT_TABLE, ReportSchema).getModel('Reports');
    }

    async createRecord(reportDto: ReportDto): Promise<ReportDto> {
        const reportData: ReportsDataType = {
            reportName: reportDto.reportName,
            reportFilename: reportDto.reportFilename,
            reportType: reportDto.reportType,
            createdBy: reportDto.createdBy,
            dateCreated: reportDto.dateCreated,
            dateRange: reportDto.dateRange,
            status: 'IN_PROGRESS',
            PK: 'REPORTS',
            fileDetails: reportDto.fileDetails as ReportFileDetailDto,
            filters: reportDto.filters as ReportFilterParams,
            GSI1PK: 'REPORTS',
            GSI1SK: reportDto.dateCreated || new Date().toISOString(),
            GSI2PK: `REPORT_TYPE#${reportDto.reportType || ''}`,
            GSI2SK: reportDto.dateCreated || new Date().toISOString(),
        };
        const reportRecord: ReportsDataType = await this.reportTable.create(reportData);
        return await this.convertToDto(reportRecord);
    }

    async updateRecordStatus(data: ReportDto): Promise<ReportDto> {
        // Update by PK/SK
        const reportRecord = await this.reportTable.get({
            PK: 'REPORTS',
            SK: data.reportId,
        });
        if (!reportRecord) {
            throw new Error('Report record not found');
        }

        reportRecord.status = data.status ?? ReportStatusEnum.FAILED;
        reportRecord.errorMessage = data.errorMessage;

        reportRecord.reportFilename = data.reportFilename;
        reportRecord.fileDetails = data.fileDetails as ReportFileDetailDto;
        const dataType: ReportsDataType = {
            ...reportRecord,
        };

        const updatedRecord = await this.reportTable.update(dataType);
        return await this.convertToDto(updatedRecord);
    }

    async deleteRecord(reportDto: ReportDto): Promise<ReportDto> {
        const reportRecord = await this.reportTable.get({
            PK: 'REPORTS',
            SK: reportDto.reportId || '',
        });
        if (!reportRecord) {
            throw new Error('Report record not found');
        }
        await this.reportTable.remove(reportRecord);

        return await this.convertToDto(reportRecord);
    }

    async findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ReportDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);
        const records = await this.reportTable.find(
            {
                GSI1PK: 'REPORTS',
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

    async findRecordsByReportTypePagination(
        reportType: string,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ReportDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);
        const records = await this.reportTable.find(
            {
                GSI2PK: `REPORT_TYPE#${reportType}`,
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

    async convertToDto(record: ReportsDataType): Promise<ReportDto> {
        const dto = new ReportDto();
        dto.reportName = record.reportName || '';
        dto.reportFilename = record.reportFilename || '';
        dto.reportType = record.reportType as ReportTypeEnum;
        dto.createdBy = record.createdBy || '';
        dto.dateCreated = record.dateCreated || '';
        dto.dateRange = record.dateRange || '';
        dto.reportId = record.reportId || '';
        dto.status = record.status as ReportStatusEnum;
        dto.fileDetails = record.fileDetails;
        dto.filters = record.filters as ReportFilterParams;
        dto.errorMessage = record.errorMessage;
        return dto;
    }

    async convertToDtoList(records: ReportsDataType[]): Promise<ReportDto[]> {
        const dtoList: ReportDto[] = [];
        for (const record of records) {
            const dto: ReportDto = await this.convertToDto(record);
            dtoList.push(dto);
        }
        return dtoList;
    }
    async findRecordById(id: string): Promise<ReportDto | null> {
        // Find by PK/SK, assuming SK is reportFilename or reportName
        const record = await this.reportTable.get({
            PK: 'REPORTS',
            SK: id,
        });
        if (!record) {
            return null;
        }
        return await this.convertToDto(record);
    }
}
