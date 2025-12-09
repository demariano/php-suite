import { AwsS3LibService } from '@aws-s3-lib';
import { FileDetailsDto, ReportDto } from '@dto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ExcelGeneratorService {
    constructor(private readonly configService: ConfigService, private readonly s3Service: AwsS3LibService) {}

    async generateExcelReport(reportDto: ReportDto): Promise<FileDetailsDto> {
        //using excelJS create an excel file from the reportDto
        const headers = reportDto.headers;

        if (
            !headers ||
            headers.length === 0 ||
            !reportDto.rows ||
            reportDto.rows.length === 0 ||
            !reportDto.reportFilename
        ) {
            throw new Error('ReportDto must have headers and rows to generate an Excel report');
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(reportDto.reportName);

        // Set columns without styles
        sheet.columns = headers.map((header) => ({
            header: header.description,
            key: header.description,
            width: undefined, // Let ExcelJS auto-size after data is added
        }));

        // Add header row with styles
        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center' };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF000000' }, // black
            };
        });

        //add the items to the sheet
        reportDto.rows.forEach((row) => {
            const rowData: Record<string, any> = {};
            headers.forEach((header) => {
                rowData[header.description] = row[header.description];
            });
            sheet.addRow(rowData);
        });

        // After adding all rows, auto-size columns
        sheet.columns.forEach((column, i) => {
            let maxLength = 10;
            column.eachCell?.((cell: ExcelJS.Cell) => {
                const cellValue = cell.value ? cell.value.toString() : '';
                maxLength = Math.max(maxLength, cellValue.length);
            });
            column.width = maxLength + 2;
        });

        return await this.saveData(workbook, reportDto);
    }

    async saveData(workbook: ExcelJS.Workbook, reportDto: ReportDto): Promise<FileDetailsDto> {
        const bucketName = this.configService.get<string>('REPORT_S3_BUCKET');
        if (!bucketName) {
            throw new Error('REPORT_S3_BUCKET is not defined in configuration');
        }

        //for debnugging purposes only save to local file system
        await workbook.xlsx.writeFile(`./${reportDto.reportFilename}`);

        const arrayBuffer = await workbook.xlsx.writeBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const id = uuidv4();
        reportDto.reportFilename = id + '-' + reportDto.reportFilename;

        await this.s3Service.uploadBuffer(
            'reports',
            bucketName,
            reportDto.reportFilename,
            buffer,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        const fileDetails: FileDetailsDto = new FileDetailsDto();
        fileDetails.fileName = reportDto.reportFilename;
        fileDetails.fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileDetails.s3Bucket = this.configService.get<string>('REPORT_S3_BUCKET') || '';
        fileDetails.s3Key = `reports/${reportDto.reportFilename}`;
        return fileDetails;
    }
}
