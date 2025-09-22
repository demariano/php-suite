import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Callback, Context, Handler } from 'aws-lambda';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app/app.module';
import { AppService } from './app/app.service';

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

    const appContext = await NestFactory.createApplicationContext(AppModule);
    const service = appContext.get(AppService);

    console.log(JSON.stringify(event));

    await service.handleMessage(event);

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Message processed successfully' }),
    };
};
