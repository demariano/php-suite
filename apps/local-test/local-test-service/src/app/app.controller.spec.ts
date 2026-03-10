jest.mock('@excel-generator-service', () => ({
    ExcelGeneratorService: jest.fn().mockImplementation(() => ({
        generateExcelReport: jest.fn(),
    })),
}));

import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    let app: TestingModule;
    const mockAppService = {
        healthCheck: jest.fn().mockReturnValue({ status: 'ok', version: '1.0.0' }),
        getVersion: jest.fn().mockReturnValue({ version: '1.0.0' }),
        createSampleExcelReport: jest.fn(),
    };

    beforeAll(async () => {
        app = await Test.createTestingModule({
            controllers: [AppController],
            providers: [{ provide: AppService, useValue: mockAppService }],
        }).compile();
    });

    describe('healthCheck', () => {
        it('should return health status with version', () => {
            const appController = app.get<AppController>(AppController);
            const result = appController.healthCheck();
            expect(result).toHaveProperty('status');
            expect(result).toHaveProperty('version');
            expect(result.status).toBe('ok');
        });
    });

    describe('getVersion', () => {
        it('should return version info', () => {
            const appController = app.get<AppController>(AppController);
            const result = appController.getVersion();
            expect(result).toHaveProperty('version');
            expect(typeof result.version).toBe('string');
        });
    });
});
