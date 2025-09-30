import { UserCognito } from '@auth-guard-lib';
import { AreaDto } from '@dto';

export class UpdateAreaCommand {
    constructor(
        public readonly recordId: string,
        public readonly areaDto: AreaDto,
        public readonly user: UserCognito
    ) {}
}
