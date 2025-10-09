import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SalesTypeModule } from './sales-type/sales-type.module';

@Module({
    imports: [SalesTypeModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
