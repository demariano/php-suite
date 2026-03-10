jest.mock('@excel-generator-service', () => ({
    ExcelGeneratorService: jest.fn(),
}));

import { Test } from '@nestjs/testing';

import { AppService } from './app.service';
import { MessageHandlerService } from './message.handler.service';

describe('AppService', () => {
    let service: AppService;

    beforeAll(async () => {
        const app = await Test.createTestingModule({
            providers: [
                AppService,
                { provide: MessageHandlerService, useValue: { handleMessage: jest.fn().mockResolvedValue(undefined) } },
            ],
        }).compile();

        service = app.get<AppService>(AppService);
    });

    describe('handleMessage', () => {
        it('should process records without throwing', async () => {
            const records = [{ body: JSON.stringify({ eventType: 'TEST_EVENT' }) }];
            await expect(service.handleMessage(records)).resolves.not.toThrow();
        });
    });
});
