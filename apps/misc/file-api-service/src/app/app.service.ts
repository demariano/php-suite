import { AwsS3LibService } from '@aws-s3-lib';
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService {
    private readonly logger = new Logger(AppService.name);

    constructor(private readonly awsS3LibService: AwsS3LibService) {}
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

    async uploadFile(bucketName: string, key: string, mimeType: string, expiration: number) {
        this.logger.log(`Uploading file to bucket ${bucketName} with key ${key}`);
        return await this.awsS3LibService.getUploadSignedUrl(bucketName, key, mimeType, expiration);
    }

    async downloadFile(bucketName: string, key: string, mimeType: string, expiration: number) {
        this.logger.log(`Downloading file from bucket ${bucketName} with key ${key}`);
        return await this.awsS3LibService.getDownloadSignedUrl(bucketName, key, mimeType, expiration);
    }
}
