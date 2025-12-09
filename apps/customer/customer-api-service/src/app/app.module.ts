import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AreaModule } from './area/area.module';
import { CustomerClassificationModule } from './customer-classification/customer-classification.module';
import { CustomerTypeModule } from './customer-type/customer-type.module';
import { CustomerModule } from './customer/customer.module';
import { TermsModule } from './terms/terms.module';

@Module({
    imports: [CustomerModule, CustomerClassificationModule, CustomerTypeModule, TermsModule, AreaModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
