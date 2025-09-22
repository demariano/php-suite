import { Module } from '@nestjs/common';

import { ConfigurationLibModule } from '@configuration-lib';
import { UserDatabaseService } from './user-database-service';

@Module({
  imports: [ConfigurationLibModule],

  providers: [UserDatabaseService],
  exports: [UserDatabaseService],
})
export class UserDatabaseServiceModule { }
