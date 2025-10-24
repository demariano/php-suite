import { UserCognito } from '@auth-guard-lib';
import { ReturnGoodSoldDto } from '@dto';

export class DeleteReturnGoodSoldCommand {
    constructor(
        public readonly recordId: string,
        public readonly returnGoodSoldDto: ReturnGoodSoldDto,
        public readonly user: UserCognito
    ) {}
}
