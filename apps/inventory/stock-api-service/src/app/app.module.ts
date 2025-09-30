import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StockTypeModule } from './stock-type/stock-type.module';
import { StockModule } from './stock/stock.module';

@Module({
    imports: [StockTypeModule, StockModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
