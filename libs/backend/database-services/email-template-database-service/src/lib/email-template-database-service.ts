import { DynamoDbLibService, EmailTemplateDataType, EmailTemplateSchema } from '@dynamo-db-lib';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Model } from 'dynamodb-onetable';
import { EmailTemplateDto, EmailTemplateType } from '@dto';

@Injectable()
export class EmailTemplateDatabaseService {

    protected readonly logger = new Logger(EmailTemplateDatabaseService.name);

    private readonly emailTemplateTable: Model<EmailTemplateDataType>;

    constructor(configService: ConfigService) {
        const DYNAMO_DB_EMAIL_TEMPLATE_TABLE = configService.get<string>('DYNAMO_DB_EMAIL_TEMPLATE_TABLE');
        if (!DYNAMO_DB_EMAIL_TEMPLATE_TABLE) {
            throw new Error('DYNAMO_DB_EMAIL_TEMPLATE_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.emailTemplateTable = dynamoDbService.dynamoDbMainTable(DYNAMO_DB_EMAIL_TEMPLATE_TABLE, EmailTemplateSchema).getModel('EmailTemplate');
    }

    async createRecord(data: EmailTemplateDto): Promise<EmailTemplateDataType> {
        const existingRecord: EmailTemplateDataType = await this.findByTemplateTypeAndLanguage(
            data.emailTemplateType, data.language
        );

        if (existingRecord && existingRecord.emailTemplateId) {
            await this.deleteById(existingRecord.emailTemplateId);
        }

        const emailTemplate: EmailTemplateDataType = {
            GSI1PK: data.emailTemplateType + '#' + data.language, // 
            data: data.data,
            subject: data.subject,
        };

        return await this.emailTemplateTable.create(emailTemplate);

    }

    async findByTemplateTypeAndLanguage(templateType: EmailTemplateType, language: string): Promise<EmailTemplateDataType> {
        const record: EmailTemplateDataType = await this.emailTemplateTable.get(
            {
                GSI1PK: templateType + '#' + language,
            },
            {
                index: 'GSI1',
                follow: true,
            }
        ) as EmailTemplateDataType;
       

        return record;
    }

    async deleteById(emailTemplateId: string) {

        try {
            await this.emailTemplateTable.remove({
                emailTemplateId: emailTemplateId,
            });

            this.logger.log(`Email template deleted: ${emailTemplateId}`);
        }
        catch (error) {
            this.logger.error(`Error deleting email template: ${error}`);
            throw new BadRequestException('Unable to delete record');
        }


    }

    async convertToDto(record: EmailTemplateDataType): Promise<EmailTemplateDto> {
        return {
            emailTemplateId: record.emailTemplateId || '', 
            subject: record.subject || '', 
            data: record.data || { htmlData: '', textData: '' }, 
            emailTemplateType: record.emailTemplateType as EmailTemplateType,
            language: record.language || '', 
        }
    }
}