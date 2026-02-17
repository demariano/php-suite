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
        if (!reportDto.reportFilename) {
            throw new Error('ReportDto must have reportFilename to generate an Excel report');
        }

        const workbook = new ExcelJS.Workbook();

        const workbookSheets = reportDto.workbook?.sheets;
        if (workbookSheets && workbookSheets.length > 0) {
            for (const sheetDto of workbookSheets) {
                if (!sheetDto.headers || sheetDto.headers.length === 0) {
                    throw new Error('Each workbook sheet must have headers to generate an Excel report');
                }
                if (!sheetDto.rows || sheetDto.rows.length === 0) {
                    throw new Error('Each workbook sheet must have rows to generate an Excel report');
                }

                const sheet = workbook.addWorksheet(sheetDto.name);
                this.writeSheet(sheet, sheetDto.headers, sheetDto.rows);
            }

            return await this.saveData(workbook, reportDto);
        }

        // Single-sheet legacy behavior
        const headers = reportDto.headers;
        if (!headers || headers.length === 0 || !reportDto.rows || reportDto.rows.length === 0) {
            throw new Error('ReportDto must have headers and rows to generate an Excel report');
        }

        const sheet = workbook.addWorksheet(reportDto.reportName);
        this.writeSheet(sheet, headers, reportDto.rows);

        return await this.saveData(workbook, reportDto);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private writeSheet(
        sheet: ExcelJS.Worksheet,
        headers: { description: string; metaData?: Record<string, unknown> }[],
        rows: Record<string, any>[]
    ) {
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

        // Add the items to the sheet
        rows.forEach((row) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rowData: Record<string, any> = {};
            headers.forEach((header) => {
                rowData[header.description] = row[header.description];
            });
            const excelRow = sheet.addRow(rowData);

            // Style sub-header rows (blue background, white bold text)
            if (row['__subHeader']) {
                excelRow.eachCell((cell) => {
                    if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
                        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                        cell.alignment = { horizontal: 'center' };
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FF3B82F6' }, // blue
                        };
                    }
                });
            }
        });

        // After adding all rows, auto-size columns
        sheet.columns.forEach((column) => {
            let maxLength = 10;
            column.eachCell?.((cell: ExcelJS.Cell) => {
                const cellValue = cell.value ? cell.value.toString() : '';
                maxLength = Math.max(maxLength, cellValue.length);
            });
            column.width = maxLength + 2;
        });
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
