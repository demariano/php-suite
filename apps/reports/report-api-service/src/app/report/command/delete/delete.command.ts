import { UserCognito } from '@auth-guard-lib';
import { ReportDto } from '@dto';

export class DeleteReportCommand {
    constructor(
        public readonly recordId: string,
        public readonly reportDto: ReportDto,
        public readonly user: UserCognito
    ) {}
}
