

export class SignUpUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) { }
}