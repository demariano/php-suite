import { Controller, Get } from '@nestjs/common';

import { FileDetailsDto } from '@dto';
import { AppService } from './app.service';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    healthCheck() {
        return this.appService.healthCheck();
    }

    @Get('version')
    getVersion() {
        return this.appService.getVersion();
    }

    @Get('generate-report')
    async generateReport(): Promise<FileDetailsDto> {
        return this.appService.createSampleExcelReport();
    }
}
