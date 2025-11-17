import { Test } from '@nestjs/testing';
import * as fs from 'fs';

import { AppService } from './app.service';

jest.mock('fs', () => ({
    readFileSync: jest.fn(),
}));

describe('AppService', () => {
    let service: AppService;

    beforeAll(async () => {
        const app = await Test.createTestingModule({
            providers: [AppService],
        }).compile();

        service = app.get<AppService>(AppService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns ok status with version on healthCheck', () => {
        const versionSpy = jest.spyOn(service, 'getVersion').mockReturnValue({ version: '2.0.0' });
        expect(service.healthCheck()).toEqual({ status: 'ok', version: '2.0.0' });
        versionSpy.mockRestore();
    });

    it('reads version from file system', () => {
        (fs.readFileSync as jest.Mock).mockReturnValue('3.1.4');
        expect(service.getVersion()).toEqual({ version: '3.1.4' });
    });

    it('falls back to default version when file read fails', () => {
        (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('missing file');
        });
        expect(service.getVersion()).toEqual({ version: '0.0.0' });
    });
});
