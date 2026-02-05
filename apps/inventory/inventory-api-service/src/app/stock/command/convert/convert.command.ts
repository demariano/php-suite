import { UserCognito } from '@auth-guard-lib';
import { ConvertStockDto } from '@dto';

export class ConvertStockCommand {
    constructor(
        public readonly stockId: string,
        public readonly convertStockDto: ConvertStockDto,
        public readonly user: UserCognito
    ) {}
}
