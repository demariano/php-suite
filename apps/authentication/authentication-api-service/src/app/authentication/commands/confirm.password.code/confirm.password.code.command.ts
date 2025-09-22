

export class ConfirmPasswordCodeCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly code: string,
  ) { }
}