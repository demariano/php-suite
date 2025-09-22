import { OmitType } from '@nestjs/swagger';
import { ConfigurationDto } from './configuration.dto';
export class CreateConfigurationDto extends OmitType(ConfigurationDto, ['configurationId'] as const) {}
