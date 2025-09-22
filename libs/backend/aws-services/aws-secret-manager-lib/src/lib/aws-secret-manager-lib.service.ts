import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AwsSecretManagerLibService {
    private client;

    constructor() {

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const awsSecretConfig: any = {
            region: process.env['DEFAULT_REGION'],
        }

        if (process.env['LOCALSTACK_STATUS'] === 'ENABLED') {
            awsSecretConfig.endpoint = process.env['LOCALSTACK_ENDPOINT'];
        }

        this.client = new SecretsManagerClient(awsSecretConfig);
    }

    async getSecrets(secretId: string | null) {
        const finalSecretId = secretId || process.env['AWS_SECRET_ID'];
        if (!finalSecretId) {
            throw new Error('Secret ID is required');
        }

        const response = await this.client.send(
            new GetSecretValueCommand({
                SecretId: finalSecretId,
                VersionStage: 'AWSCURRENT',
            })
        );

        const secrets = response.SecretString;

        return secrets;
    }
}
