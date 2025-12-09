import { AwsS3LibModule } from '@aws-s3-lib';
import { Module } from '@nestjs/common';
import { ExcelGeneratorService } from './excel-generator-service';

@Module({
    imports: [AwsS3LibModule],
    providers: [ExcelGeneratorService],
    exports: [ExcelGeneratorService],
})
export class ExcelGeneratorServiceModule {}
