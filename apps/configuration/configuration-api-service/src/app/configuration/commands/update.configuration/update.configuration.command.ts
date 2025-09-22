import { UpdateConfigurationDto } from "@dto";

export class UpdateConfigurationCommand {

  configurationDto: UpdateConfigurationDto


  constructor(
    configurationDto: UpdateConfigurationDto,

  ) {
    this.configurationDto = configurationDto;

  }
}