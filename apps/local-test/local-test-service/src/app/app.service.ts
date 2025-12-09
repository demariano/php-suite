import { FileDetailsDto, ReportDto } from '@dto';
import { ExcelGeneratorService } from '@excel-generator-service';
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
@Injectable()
export class AppService {
    constructor(private readonly excelGeneratorService: ExcelGeneratorService) {}
    healthCheck(): { status: string; version: string } {
        //get the version and return it as part of the health check
        const version = this.getVersion();
        return { status: 'ok', version: version.version };
    }

    getVersion(): { version: string } {
        // read the version.dat file from the assets directory
        const versionPath = path.join(__dirname, 'assets', 'version.dat');
        let version: string;
        try {
            version = fs.readFileSync(versionPath, 'utf8').trim();
        } catch (err) {
            console.error(`Error reading version.dat file: ${err}`);
            version = '0.0.0';
        }
        return { version };
    }

    async createSampleExcelReport(): Promise<FileDetailsDto> {
        const reportDto = new ReportDto();
        reportDto.reportName = 'Sample Report';
        reportDto.reportFilename = 'sample-report.xlsx';
        reportDto.headers = [
            { description: 'ID', metaData: {} },
            { description: 'Name', metaData: {} },
            { description: 'Email', metaData: {} },
        ];
        reportDto.rows = [
            { ID: 1, Name: 'John Doe', Email: 'john.doe@example.com' },
            { ID: 2, Name: 'Jane Smith', Email: 'jane.smith@example.com' },
            { ID: 3, Name: 'Alice Johnson', Email: 'alice.johnson@example.com' },
        ];

        return await this.excelGeneratorService.generateExcelReport(reportDto);
    }
}
