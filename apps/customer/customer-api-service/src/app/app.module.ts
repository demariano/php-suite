import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AreaModule } from './area/area.module';
import { CustomerClassificationModule } from './customer-classification/customer-classification.module';
import { CustomerTypeModule } from './customer-type/customer-type.module';
import { TermsModule } from './terms/terms.module';
import { TownModule } from './town/town.module';

@Module({
    imports: [CustomerClassificationModule, CustomerTypeModule, TermsModule, AreaModule, TownModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
