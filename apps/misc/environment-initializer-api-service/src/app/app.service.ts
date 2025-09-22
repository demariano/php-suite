import { ConfigurationDatabaseServiceAbstract } from '@configuration-database-service';
import { ConfigurationDto, InitializeEnvironmentDto } from '@dto';
import { Inject, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService {
    constructor(
        @Inject('ConfigurationDatabaseService')
        private readonly configurationDatabaseService: ConfigurationDatabaseServiceAbstract
    ) {}

    healthCheck(): { status: string; version: string } {
        //get the version and return it as part of the health check
        const version = this.getVersion();
        return { status: 'ok', version: version.version };
    }

    getVersion(): { version: string } {
        // read the version.dat file from the assets directory
        const versionPath = path.join(__dirname, 'assets', 'version.dat');
        let version: string;
        try {
            version = fs.readFileSync(versionPath, 'utf8').trim();
        } catch (err) {
            console.error(`Error reading version.dat file: ${err}`);
            version = '0.0.0';
        }
        return { version };
    }

    async initializeEnvironment(initializeEnvironmentDto: InitializeEnvironmentDto) {
        const configurationData3: ConfigurationDto = new ConfigurationDto();
        configurationData3.configurationName = 'DEFAULT_SENDER_EMAIL';
        configurationData3.configurationValue = initializeEnvironmentDto.defaultSenderEmail;
        try {
            await this.configurationDatabaseService.createRecord(configurationData3);
        } catch (error) {
            console.error('Failed to create configuration record:', error);
        }
    }
}
