export class GetAccountsByAccountTypeQuery {
    constructor(
        public readonly accountType: string,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}
