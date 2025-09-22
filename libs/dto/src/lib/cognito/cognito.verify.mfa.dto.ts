import { ApiProperty } from "@nestjs/swagger";

export class CognitoVerifyMfaDto {
  @ApiProperty()
  email!: string;

  @ApiProperty()
  session!: string;

  @ApiProperty()
  code!: string;


}
