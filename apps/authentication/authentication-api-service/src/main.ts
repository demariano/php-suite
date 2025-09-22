import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import serverlessExpress from '@codegenie/serverless-express';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { APIGatewayEvent, Context, Handler ,Callback} from 'aws-lambda';

let cachedServer: Handler;

async function createSwaggerConfig() {
    return new DocumentBuilder()
        .setTitle('AUTHENTICATION-API-SERVICE')
        .setDescription('AUTHENTICATION-API-SERVICE API')
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
            'JWT-auth',
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


    const port = process.env.PORT || 4020;

    await app.listen(port);
    Logger.log(`🚀 AUTHENTICATION-API-SERVICE is running on: http://localhost:${port}/api`);
    Logger.log(`🚀 AUTHENTICATION-API-SERVICE Swagger Endpoint : http://localhost:${port}/api/swagger`);
}

async function bootstrapLambda() {
    if (!cachedServer) {
        const expressApp = express();
        const nestApp = await NestFactory.create(
            AppModule,
            new ExpressAdapter(expressApp),
        );

      
        await setupGlobalMiddleware(nestApp);
        const config = await createSwaggerConfig();
        const document = SwaggerModule.createDocument(nestApp, config);
        SwaggerModule.setup('swagger', nestApp, document, { useGlobalPrefix: true });
        await nestApp.init();
        cachedServer = serverlessExpress({ app: expressApp });
    }
    return cachedServer;
}

if (process.env.SERVICE_TRIGGER  && process.env.SERVICE_TRIGGER  === 'LOCALHOST') {
    Logger.log('Starting local server');    
    bootstrapServer();
}

export const handler: Handler = async (event: APIGatewayEvent, context: Context, callback: Callback) => {
    Logger.log('Starting lambda server');    
    cachedServer = cachedServer ?? (await bootstrapLambda());

    return cachedServer(event, context, callback);
};


