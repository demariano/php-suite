import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Callback, Context, Handler } from 'aws-lambda';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app/app.module';
import { LambdaAppService } from './app/lambda.app.service';
import { LambdaModule } from './app/lambda.module';
import { SqsLocalService } from './app/sqs.local.service';

async function createSwaggerConfig() {
    return new DocumentBuilder()
        .setTitle('BROADCAST-MESSAGE-SERVICE')
        .setDescription('BROADCAST-MESSAGE-SERVICE API')
        .setVersion('1.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'JWT-auth'
        )
        .build();
}

async function setupGlobalMiddleware(app: INestApplication) {
    const globalPrefix = 'api';
    app.setGlobalPrefix(globalPrefix);
    app.enableCors();
    app.useGlobalPipes(new ValidationPipe());
}

async function bootstrapServer() {
    const app = await NestFactory.create(AppModule);

    await setupGlobalMiddleware(app);
    const config = await createSwaggerConfig();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('swagger', app, document, { useGlobalPrefix: true });

    Logger.log(`🚀 LOCALSTACK_STATUS: ${process.env.LOCALSTACK_STATUS}`);
    if (process.env.LOCALSTACK_STATUS === 'ENABLED') {
        const appContext = await NestFactory.createApplicationContext(AppModule);
        const sqsService = appContext.get(SqsLocalService);
        sqsService.pollQueue();
    }
}

if (process.env.SERVICE_TRIGGER && process.env.SERVICE_TRIGGER === 'LOCALHOST') {
    Logger.log('Starting local server');
    bootstrapServer();
}

export const handler: Handler = async (event: any, context: Context, callback: Callback) => {
    Logger.log('Starting Lambda event handler');

    //read the version.dat file
    let version = '0.0.0';
    try {
        const versionPath = path.join(__dirname, 'assets', 'version.dat');
        version = fs.readFileSync(versionPath, 'utf8').trim();
    } catch (err) {
        Logger.error(`Error reading version.dat file: ${err}`);
        version = '0.0.0';
    }
    Logger.log(`Version: ${version}`);

    const appContext = await NestFactory.createApplicationContext(LambdaModule);
    const service = appContext.get(LambdaAppService);

    await service.handleMessage(event.Records);

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Message processed successfully' }),
    };
};
