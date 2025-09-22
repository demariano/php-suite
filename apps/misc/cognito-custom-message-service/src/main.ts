import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app/app.module';
import { AppService } from './app/app.service';


async function createSwaggerConfig() {
    return new DocumentBuilder()
        .setTitle('COGNITO-CUSTOM-MESSAGE-SERVICE')
        .setDescription('COGNITO-CUSTOM-MESSAGE-SERVICE API')
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


    const port = process.env.PORT || 4011;

    await app.listen(port);
    Logger.log(`🚀 COGNITO-CUSTOM-MESSAGE-SERVICE is running on: http://localhost:${port}/api`);
    Logger.log(`🚀 COGNITO-CUSTOM-MESSAGE-SERVICE Swagger Endpoint : http://localhost:${port}/api/swagger`);
}


if (process.env.SERVICE_TRIGGER  && process.env.SERVICE_TRIGGER  === 'LOCALHOST') {
    Logger.log('Starting local server');    
    bootstrapServer();
}


export const handler: Handler = async (
    event: unknown,
    context: Context,
    callback: Callback
) => {
    const appContext = await NestFactory.createApplicationContext(AppModule);
    const service = appContext.get(AppService);

    console.log('Event: ', JSON.stringify(event));
    event = await service.handleMessage(event);
    callback(null, event);
};