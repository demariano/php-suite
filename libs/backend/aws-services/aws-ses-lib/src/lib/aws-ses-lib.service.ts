import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { EmailNotificationDto } from '@dto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
@Injectable()
export class AwsSesLibService {
    private readonly logger = new Logger(AwsSesLibService.name);

    private transporter: nodemailer.Transporter;

    private client;
    constructor(private readonly configService: ConfigService) {

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const awsSecretConfig: any = {
            region: process.env['DEFAULT_REGION'],
        }

        if (process.env['LOCALSTACK_STATUS'] === 'ENABLED') {
            awsSecretConfig.credentials = {
                accessKeyId: process.env['AWS_ACCESS_KEY_LOCAL_DEV'],
                secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY_LOCAL_DEV'],
            };
        }
        this.client = new SESClient(awsSecretConfig);



        this.transporter = nodemailer.createTransport({
            SES: {
                ses: this.client,
                aws: { SendRawEmailCommand }
            },
        });

    }

    async sendEmail(data: EmailNotificationDto) {


        this.logger.log(`Sending Email to ${data.toAddress} from ${data.source} with subject ${data.subjectData} `);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attachments = data.files?.map((file: any) => ({
            filename: file.originalname,
            content: file.buffer,
        }));

        const mailOptions: nodemailer.SendMailOptions = {
            from: data.source,
            to: data.toAddress,
            replyTo: data.replyToAddress,
            subject: data.subjectData,
            text: data.messageBodyTextData,
            html: data.messageBodyHtmlData,
            attachments: attachments
        };



        try {
            const result = await this.transporter.sendMail(mailOptions);

            this.logger.log('Email Sent Successfully JSON.stringify(result)');

            return result;
        } catch (error) {
            this.logger.error(error);
            throw error;
        }

    }


}
