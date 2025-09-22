import { ApiProperty } from '@nestjs/swagger';

export class EmailTemplateDataDto {

    @ApiProperty()
    htmlData?: string;

    @ApiProperty()
    textData?: string;

}
