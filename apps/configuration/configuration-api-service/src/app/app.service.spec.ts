import { Test } from '@nestjs/testing';

import { AppService } from './app.service';

describe('AppService', () => {
    let service: AppService;

    beforeAll(async () => {
        const app = await Test.createTestingModule({
            providers: [AppService],
        }).compile();

        service = app.get<AppService>(AppService);
    });

    describe('healthCheck', () => {
        it('should return status ok with version', () => {
            const result = service.healthCheck();
            expect(result).toHaveProperty('status', 'ok');
            expect(result).toHaveProperty('version');
            expect(typeof result.version).toBe('string');
        });
    });

    describe('getVersion', () => {
        it('should return version from version.dat file', () => {
            const result = service.getVersion();
            expect(result).toHaveProperty('version');
            expect(typeof result.version).toBe('string');
            // The version should be read from the version.dat file
            expect(result.version.length).toBeGreaterThan(0);
        });
    });
});
