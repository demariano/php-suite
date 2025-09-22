import { AwsSecretManagerLibService } from '@aws-secret-manager-lib';

export const configuration = async () => {
    const awsSecretsService = new AwsSecretManagerLibService();
    const secrets = await awsSecretsService.getSecrets(null);
    const awsSecrets = secrets ? JSON.parse(secrets) : {};

    return {
        NODE_ENV: process.env['NODE_ENV'],
        DEFAULT_REGION: process.env['DEFAULT_REGION'],
        DYNAMO_DB_USER_TABLE: process.env['DYNAMO_DB_USER_TABLE'],
        DYNAMO_DB_EMAIL_TEMPLATE_TABLE: process.env['DYNAMO_DB_EMAIL_TEMPLATE_TABLE'],
        DYNAMO_DB_CONFIGURATION_TABLE: process.env['DYNAMO_DB_CONFIGURATION_TABLE'],
        SERVICE_TRIGGER: process.env['SERVICE_TRIGGER'],
        FE_BASE_URL: process.env['FE_BASE_URL'],
        AWS_COGNITO_USER_POOL_ID: process.env['AWS_COGNITO_USER_POOL_ID'],
        AWS_COGNITO_CLIENT_ID: process.env['AWS_COGNITO_CLIENT_ID'],
        AWS_COGNITO_AUTHORITY: process.env['AWS_COGNITO_AUTHORITY'],
        WEB_APP_API_KEY: await awsSecrets['WEB_APP_API_KEY'],
        AWS_SECRET_ID: process.env['AWS_SECRET_ID'],
        USER_EVENT_SQS: process.env['USER_EVENT_SQS'],
        WEBSOCKET_CONNECTION_URL: process.env['WEBSOCKET_CONNECTION_URL'],
        WEBSOCKET_MESSAGE_SQS: process.env['WEBSOCKET_MESSAGE_SQS'],
        DYNAMO_DB_WEB_SOCKET_CONNECTION_TABLE: process.env['DYNAMO_DB_WEB_SOCKET_CONNECTION_TABLE'],
        S3_NX_TEMPLATE2_DEV_DATA: process.env['S3_NX_TEMPLATE2_DEV_DATA'],
    };
};
