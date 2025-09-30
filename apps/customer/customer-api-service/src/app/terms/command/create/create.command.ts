import { CreateTermsDto } from '@dto';
import { UserCognito } from '@auth-guard-lib';

export class CreateTermsCommand {
    constructor(
        public readonly termsDto: CreateTermsDto,
        public readonly user: UserCognito
    ) {}
}
