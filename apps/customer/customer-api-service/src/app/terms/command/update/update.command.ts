import { TermsDto } from '@dto';
import { UserCognito } from '@auth-guard-lib';

export class UpdateTermsCommand {
    constructor(
        public readonly recordId: string,
        public readonly termsDto: TermsDto,
        public readonly user: UserCognito
    ) {}
}
