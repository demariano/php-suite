import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Readable } from 'stream';

@Injectable()
export class AwsS3LibService {
    private awsS3Config: S3Client;
    private readonly logger = new Logger(AwsS3LibService.name);

    constructor(private readonly configService: ConfigService) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s3Config: any = {
            region: this.configService.get<string>('DEFAULT_REGION')
        };

        if (process.env['LOCALSTACK_STATUS'] === 'ENABLED') {
            s3Config.credentials = {
                accessKeyId: process.env['AWS_ACCESS_KEY_LOCAL_DEV'],
                secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY_LOCAL_DEV'],
            };
            this.logger.log('Using AWS credentials from LOCAL_DEV for actual S3');
        }

        this.awsS3Config = new S3Client(s3Config);
    }

    async getS3Object(bucket: string, name: string) {

        this.logger.log(`Getting S3 Object from bucket ${bucket} with key ${name}`);

        const input = {
            Bucket: bucket,
            Key: name,
        };
        const command = new GetObjectCommand(input);
        const response = await this.awsS3Config.send(command);

        return response.Body as Readable;
    }

    async getS3ObjectAsBuffer(bucket: string, key: string, mimeType: string) {

        this.logger.log(`Getting S3 Object as buffer from bucket ${bucket} with key ${key}`);

        const input = {
            Bucket: bucket,
            Key: key,
            ContentType: mimeType,
        };
        const command = new GetObjectCommand(input);

        //todo make this work
        const signedUrl = await getSignedUrl(this.awsS3Config, command, {
            expiresIn: 3600,
        }); // URL expires in 1 hour

        // Use the pre-signed URL to download the object as a buffer
        const response = await axios.get(signedUrl, {
            responseType: 'arraybuffer',
        });
        const buffer = Buffer.from(response.data, 'binary');

        return buffer;
    }

    async getDownloadSignedUrl(
        bucket: string,
        key: string,
        mimeType: string,
        expiration: number
    ) {

        this.logger.log(`Getting S3 Object as signed url from bucket ${bucket} with key ${key}`);

        const input = {
            Bucket: bucket,
            Key: key,
            ContentType: mimeType,
        };
        const command = new GetObjectCommand(input);
        const signedUrl = await getSignedUrl(this.awsS3Config, command, {
            expiresIn: expiration,
        });

        return signedUrl;
    }

    async uploadFile(
        folderName: string,
        bucketName: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        file: any,
        newFileName: string
    ) {

        this.logger.log(`Uploading file to bucket ${bucketName} with folder ${folderName} and new file name ${newFileName}`);

        const { originalname } = file;
        let fileName = originalname;

        if (newFileName != null) {
            fileName = newFileName;
        }

        const bucketS3 = bucketName;

        return await this.uploadS3(
            file,
            file.mimetype,
            bucketS3,
            folderName + '/' + fileName
        );
    }

    async uploadS3(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        file: any,
        mimeType: string,
        bucket: string,
        key: string
    ) {

        this.logger.log(`Uploading file to bucket ${bucket} with key ${key}`);
        const input = {
            Bucket: bucket,
            Key: key,
            mimeType: mimeType,
            Body: file.buffer,
        };
        const command = new PutObjectCommand(input);
        const response = await this.awsS3Config.send(command);

        return response;
    }

    async uploadBuffer(
        folderName: string,
        bucketName: string,
        originalname: string,
        data: Buffer,
        mimetype: unknown
    ) {

        this.logger.log(`Uploading file to bucket ${bucketName} with folder ${folderName} and original name ${originalname}`);

        const bucketS3 = bucketName;

        return await this.uploadS3FromBuffer(
            data,
            mimetype,
            bucketS3,
            folderName + '/' + originalname
        );
    }

    async uploadS3FromBuffer(
        data: Buffer,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mimetype: any,
        bucket: string,
        name: string
    ) {

        this.logger.log(`Uploading file to bucket ${bucket} with key ${name}`);

        const input = {
            Bucket: bucket,
            Key: String(name),
            Body: data,
            ContentType: mimetype,
        };
        const command = new PutObjectCommand(input);
        const response = await this.awsS3Config.send(command);

        return response;
    }

    async getUploadSignedUrl(
        bucket: string,
        key: string,
        mimeType: string,
        expiration: number
    ) {

        this.logger.log(`Getting S3 Object as signed url from bucket ${bucket} with key ${key}`);

        const input = {
            Bucket: bucket,
            Key: key,
            ContentType: mimeType,
        };
        const command = new PutObjectCommand(input);
        const signedUrl = await getSignedUrl(this.awsS3Config, command, {
            expiresIn: expiration,
        });

        return signedUrl;
    }
}
