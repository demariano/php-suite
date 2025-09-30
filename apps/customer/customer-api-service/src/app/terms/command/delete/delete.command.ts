import { UserCognito } from '@auth-guard-lib';
import { TermsDto } from '@dto';

export class DeleteTermsCommand {
    constructor(
        public readonly recordId: string,
        public readonly termsDto: TermsDto,
        public readonly user: UserCognito
    ) {}
}
