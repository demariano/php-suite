import { UserCognito } from '@auth-guard-lib';
import { CreateReportDto } from '@dto';

export class CreateReportCommand {
    constructor(public readonly reportDto: CreateReportDto, public readonly user: UserCognito) {}
}
