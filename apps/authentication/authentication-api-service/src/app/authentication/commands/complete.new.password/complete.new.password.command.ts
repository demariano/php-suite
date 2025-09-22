

export class CompleteNewPasswordCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly session: string,
  ) { }
}