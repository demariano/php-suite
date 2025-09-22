import { OmitType } from "@nestjs/swagger";
import { ConfigurationDto } from "./configuration.dto";

export class UpdateConfigurationDto extends OmitType(ConfigurationDto, ['configurationId']) {

}


