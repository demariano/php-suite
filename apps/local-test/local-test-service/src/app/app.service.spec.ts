jest.mock('@excel-generator-service', () => ({
    ExcelGeneratorService: jest.fn().mockImplementation(() => ({
        generateExcelReport: jest.fn(),
    })),
}));

import { Test } from '@nestjs/testing';

import { ExcelGeneratorService } from '@excel-generator-service';
import { AppService } from './app.service';

describe('AppService', () => {
    let service: AppService;

    beforeAll(async () => {
        const app = await Test.createTestingModule({
            providers: [AppService, { provide: ExcelGeneratorService, useValue: { generateExcelReport: jest.fn() } }],
        }).compile();

        service = app.get<AppService>(AppService);
    });

    describe('healthCheck', () => {
        it('should return health status with version', () => {
            const result = service.healthCheck();
            expect(result).toHaveProperty('status');
            expect(result).toHaveProperty('version');
            expect(result.status).toBe('ok');
        });
    });

    describe('getVersion', () => {
        it('should return version info', () => {
            const result = service.getVersion();
            expect(result).toHaveProperty('version');
            expect(typeof result.version).toBe('string');
        });
    });
});
