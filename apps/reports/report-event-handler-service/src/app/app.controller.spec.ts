jest.mock('@excel-generator-service', () => ({
    ExcelGeneratorService: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    let app: TestingModule;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            controllers: [AppController],
            providers: [{ provide: AppService, useValue: { handleMessage: jest.fn().mockResolvedValue(undefined) } }],
        }).compile();
    });

    describe('handleMessage', () => {
        it('should delegate to AppService', async () => {
            const appController = app.get<AppController>(AppController);
            const body = [{ body: '{}' }];
            await appController.handleMessage(body);
        });
    });
});
