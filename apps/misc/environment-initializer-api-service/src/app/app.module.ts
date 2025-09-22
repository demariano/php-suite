import { Module } from '@nestjs/common';

import { AuthGuardLibModule } from '@auth-guard-lib';
import { AwsCognitoLibModule } from '@aws-cognito-lib';
import { ConfigurationDatabaseService, ConfigurationDatabaseServiceModule } from '@configuration-database-service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
    imports: [ConfigurationDatabaseServiceModule, AwsCognitoLibModule, AuthGuardLibModule],
    controllers: [AppController],
    providers: [AppService,
        {
            provide: 'ConfigurationDatabaseService',
            useClass: ConfigurationDatabaseService,
        },
    ],
})
export class AppModule { }
