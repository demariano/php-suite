---
name: 'nestjs-api-microservice'
description: 'USE FOR: Creating a new NestJS API microservice, scaffolding main.ts with dual-mode bootstrap (Express local + Lambda), root app.module.ts, app.service.ts health check, app.controller.ts, webpack.config.js, project.json build targets. Covers port assignment, Swagger setup, serverless-express configuration.'
---

# NestJS API Microservice Scaffolding

## Directory Structure

```
apps/{domain}/{domain}-api-service/
├── src/
│   ├── main.ts                     # Dual-mode bootstrap
│   ├── app/
│   │   ├── app.module.ts           # Root module importing feature modules
│   │   ├── app.controller.ts       # Health check endpoint
│   │   ├── app.service.ts          # Health check + version reader
│   │   └── {entity}/               # Feature modules (see nestjs-cqrs-module skill)
│   └── assets/
│       └── version.dat             # Version number for health check
├── webpack.config.js               # Nx webpack config for Lambda
├── project.json                    # Nx project configuration
├── tsconfig.app.json
└── tsconfig.json
```

## Template: main.ts (Dual-Mode Bootstrap)

```ts
import serverlessExpress from '@codegenie/serverless-express';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import express from 'express';
import { AppModule } from './app/app.module';

let cachedServer: Handler;

async function createSwaggerConfig() {
    return new DocumentBuilder()
        .setTitle('{DOMAIN}-API-SERVICE')
        .setDescription('{DOMAIN}-API-SERVICE API')
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

    const port = process.env.PORT || { PORT };
    await app.listen(port);
    Logger.log(`🚀 {DOMAIN}-API-SERVICE is running on: http://localhost:${port}/api`);
    Logger.log(`🚀 {DOMAIN}-API-SERVICE Swagger Endpoint : http://localhost:${port}/api/swagger`);
}

async function bootstrapLambda() {
    if (!cachedServer) {
        const expressApp = express();
        const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
        await setupGlobalMiddleware(nestApp);
        const config = await createSwaggerConfig();
        const document = SwaggerModule.createDocument(nestApp, config);
        SwaggerModule.setup('swagger', nestApp, document, { useGlobalPrefix: true });
        await nestApp.init();
        cachedServer = serverlessExpress({ app: expressApp });
    }
    return cachedServer;
}

if (process.env.SERVICE_TRIGGER && process.env.SERVICE_TRIGGER === 'LOCALHOST') {
    Logger.log('Starting local server');
    bootstrapServer();
}

export const handler: Handler = async (event: APIGatewayEvent, context: Context, callback: Callback) => {
    Logger.log('Starting lambda server');
    cachedServer = cachedServer ?? (await bootstrapLambda());
    return cachedServer(event, context, callback);
};
```

**Port convention:** Check `last.port.used` in project root and increment. Current range: 4080–4100+.

## Template: app.module.ts

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { {Entity1}Module } from './{entity1-kebab}/{entity1-kebab}.module';
import { {Entity2}Module } from './{entity2-kebab}/{entity2-kebab}.module';

@Module({
    imports: [
        {Entity1}Module,
        {Entity2}Module,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
```

## Template: app.service.ts

```ts
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService {
    healthCheck(): { status: string; version: string } {
        const version = this.getVersion();
        return { status: 'ok', version: version.version };
    }

    getVersion(): { version: string } {
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
}
```

## Template: app.controller.ts

```ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    healthCheck() {
        return this.appService.healthCheck();
    }
}
```

## Template: webpack.config.js

```js
const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
    output: {
        libraryTarget: 'commonjs2',
        path: join(__dirname, '../../../dist/apps/{domain}/{domain}-api-service'),
    },
    plugins: [
        new NxAppWebpackPlugin({
            target: 'node',
            compiler: 'tsc',
            main: './src/main.ts',
            tsConfig: './tsconfig.app.json',
            assets: ['./src/assets'],
            optimization: false,
            outputHashing: 'none',
            generatePackageJson: true,
        }),
    ],
};
```

## Template: project.json

```json
{
    "name": "{domain}-api-service",
    "$schema": "../../../node_modules/nx/schemas/project-schema.json",
    "sourceRoot": "apps/{domain}/{domain}-api-service/src",
    "projectType": "application",
    "tags": [],
    "targets": {
        "build-serverless-files": {
            "executor": "nx:run-commands",
            "options": {
                "cwd": "dist/apps/{domain}/{domain}-api-service",
                "commands": [{ "command": "yarn add tslib" }],
                "parallel": false
            }
        },
        "serve": {
            "executor": "@nx/js:node",
            "defaultConfiguration": "development",
            "dependsOn": ["build"],
            "options": {
                "buildTarget": "{domain}-api-service:build",
                "runBuildTargetDependencies": false
            },
            "configurations": {
                "development": {
                    "buildTarget": "{domain}-api-service:build:development"
                },
                "production": {
                    "buildTarget": "{domain}-api-service:build:production"
                }
            }
        }
    }
}
```

## Environment Variables Required

Add to `.env` (local) and Secrets Manager / Terraform (deployed):

```
SERVICE_TRIGGER=LOCALHOST
PORT={PORT}
BYPASS_AUTH=ENABLED
DYNAMO_DB_{DOMAIN}_TABLE={domain}-table
LOCALSTACK_STATUS=ENABLED
LOCALSTACK_ENDPOINT=http://localhost:4566
DEFAULT_REGION=ap-southeast-1
{DOMAIN}_EVENT_SQS=http://localhost:4566/000000000000/{DOMAIN}_EVENT_SQS
```

## VS Code Task

Add to `.vscode/tasks.json`:

```json
{
    "label": "{Domain} Api Service",
    "type": "shell",
    "command": "npx nx serve {domain}-api-service --skip-nx-cache"
}
```

## Key Rules

1. **Dual-mode `main.ts`** — `SERVICE_TRIGGER=LOCALHOST` starts Express; otherwise exports Lambda handler
2. **Swagger always at `/api/swagger`** — configured with `useGlobalPrefix: true`
3. **Lambda uses `@codegenie/serverless-express`** with cached server pattern
4. **`ValidationPipe` is global** — NestJS validation on all request bodies
5. **`webpack.config.js` output** — `libraryTarget: 'commonjs2'` for Lambda compatibility
6. **Port must be unique** — check `last.port.used` and increment by 1
