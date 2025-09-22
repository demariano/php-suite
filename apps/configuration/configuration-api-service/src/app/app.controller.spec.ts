import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    let app: TestingModule;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            controllers: [AppController],
            providers: [AppService],
        }).compile();
    });

    describe('healthCheck', () => {
        it('should return status ok with version', () => {
            const appController = app.get<AppController>(AppController);
            const result = appController.healthCheck();
            expect(result).toHaveProperty('status', 'ok');
            expect(result).toHaveProperty('version');
            expect(typeof result.version).toBe('string');
        });
    });

    describe('getVersion', () => {
        it('should return version object', () => {
            const appController = app.get<AppController>(AppController);
            const result = appController.getVersion();
            expect(result).toHaveProperty('version');
            expect(typeof result.version).toBe('string');
        });
    });
});
