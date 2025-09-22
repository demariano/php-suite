

export class ConfirmUserCommand {
  constructor(
    public readonly email: string,
    public readonly code: string,
  ) { }
}