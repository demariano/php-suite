import { ApiProperty } from '@nestjs/swagger';

import { EmailTemplateDataDto } from './email.template.data.dto';
import { EmailTemplateType } from './email.template.type.enum';

export class EmailTemplateDto {

    @ApiProperty()
    language!: string;

    @ApiProperty({
        enum: EmailTemplateType,
    })
    emailTemplateType!: EmailTemplateType;


    @ApiProperty()
    emailTemplateId?: string;

    @ApiProperty(
        {
            type: EmailTemplateDataDto,
        }
    )
    data!: EmailTemplateDataDto;

    @ApiProperty()
    subject!: string;
}
