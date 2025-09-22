
export class UserCognito {
    username: string;
    roles: string[];

    constructor(username: string, roles: string[]) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        (this.username = username), (this.roles = roles);
    }
}
