import { UserCognito } from '@auth-guard-lib';
import { CreateAreaDto } from '@dto';

export class CreateAreaCommand {
    constructor(public readonly areaDto: CreateAreaDto, public readonly user: UserCognito) {}
}
