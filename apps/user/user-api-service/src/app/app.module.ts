import { Module } from '@nestjs/common';

import { ConfigurationLibModule } from '@configuration-lib';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './users/users.module';

@Module({
  imports: [UserModule, ConfigurationLibModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
