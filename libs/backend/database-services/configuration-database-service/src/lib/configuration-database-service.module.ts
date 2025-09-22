import { ConfigurationLibModule } from '@configuration-lib';
import { Module } from '@nestjs/common';
import { ConfigurationDatabaseService } from './configuration-database-service';

@Module({
    imports: [ConfigurationLibModule],
    providers: [ConfigurationDatabaseService],
    exports: [ConfigurationDatabaseService],
})
export class ConfigurationDatabaseServiceModule { }
