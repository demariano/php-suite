import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    let app: TestingModule;
    const mockAppService = {
        healthCheck: jest.fn().mockReturnValue({ status: 'ok', version: '1.0.0' }),
        getVersion: jest.fn().mockReturnValue({ version: '1.0.0' }),
    };

    beforeAll(async () => {
        app = await Test.createTestingModule({
            controllers: [AppController],
            providers: [
                {
                    provide: AppService,
                    useValue: mockAppService,
                },
            ],
        }).compile();
    });

    it('returns health check payload', () => {
        const appController = app.get<AppController>(AppController);
        expect(appController.healthCheck()).toEqual({ status: 'ok', version: '1.0.0' });
    });

    it('returns version payload', () => {
        const appController = app.get<AppController>(AppController);
        expect(appController.getVersion()).toEqual({ version: '1.0.0' });
    });
});
