

export class ChangePasswordCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) { }
}