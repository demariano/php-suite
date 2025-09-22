

export class VerifyMFACodeCommand {
  constructor(
    public readonly email: string,
    public readonly code: string,
    public readonly session: string,


  ) { }
}