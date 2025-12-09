import { Module } from '@nestjs/common';

import { ExcelGeneratorServiceModule } from '@excel-generator-service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
    imports: [ExcelGeneratorServiceModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
