import { CognitoRefreshTokenDto } from "@dto";


export class RefreshTokenCommand {

  public readonly refreshToken: CognitoRefreshTokenDto;
  constructor(
    refreshToken: CognitoRefreshTokenDto,
  ) {
    this.refreshToken = refreshToken;
  }
}