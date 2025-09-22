import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GetDownloadUrlQuery } from './queries/get.download.url/get.download.url.query';
import { GetUploadUrlQuery } from './queries/get.upload.url/get.upload.url.query';

describe('AppController', () => {
    let controller: AppController;
    let appService: jest.Mocked<AppService>;
    let queryBus: jest.Mocked<QueryBus>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [
                {
                    provide: AppService,
                    useValue: {
                        healthCheck: jest.fn(),
                        getVersion: jest.fn(),
                    },
                },
                {
                    provide: QueryBus,
                    useValue: {
                        execute: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<AppController>(AppController);
        appService = module.get(AppService) as jest.Mocked<AppService>;
        queryBus = module.get(QueryBus) as jest.Mocked<QueryBus>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('healthCheck', () => {
        it('should return health check data', () => {
            const expectedResult = {
                status: 'ok',
                version: '1.0.0'
            };

            appService.healthCheck.mockReturnValue(expectedResult);

            const result = controller.healthCheck();

            expect(appService.healthCheck).toHaveBeenCalled();
            expect(result).toEqual(expectedResult);
        });
    });

    describe('getVersion', () => {
        it('should return version data', () => {
            const expectedResult = {
                version: '1.0.0'
            };

            appService.getVersion.mockReturnValue(expectedResult);

            const result = controller.getVersion();

            expect(appService.getVersion).toHaveBeenCalled();
            expect(result).toEqual(expectedResult);
        });
    });

    describe('uploadFile', () => {
        it('should execute upload query with correct parameters', async () => {
            const bucketName = 'test-bucket';
            const key = 'uploads/document.pdf';
            const mimeType = 'application/pdf';
            const expiration = 3600;
            const expectedResult = { url: 'https://s3.amazonaws.com/signed-upload-url' };

            queryBus.execute.mockResolvedValue(expectedResult);

            const result = await controller.uploadFile(bucketName, key, mimeType, expiration);

            expect(queryBus.execute).toHaveBeenCalledWith(
                new GetUploadUrlQuery(bucketName, key, mimeType, expiration)
            );
            expect(result).toEqual(expectedResult);
        });

        it('should handle different file types for upload', async () => {
            const testCases = [
                { key: 'documents/contract.pdf', mimeType: 'application/pdf' },
                { key: 'images/profile.jpg', mimeType: 'image/jpeg' },
                { key: 'videos/demo.mp4', mimeType: 'video/mp4' }
            ];

            for (const testCase of testCases) {
                const bucketName = 'uploads-bucket';
                const expiration = 1800;
                const expectedResult = { url: `https://s3.amazonaws.com/${testCase.key}` };

                queryBus.execute.mockResolvedValue(expectedResult);

                const result = await controller.uploadFile(bucketName, testCase.key, testCase.mimeType, expiration);

                expect(queryBus.execute).toHaveBeenCalledWith(
                    new GetUploadUrlQuery(bucketName, testCase.key, testCase.mimeType, expiration)
                );
                expect(result).toEqual(expectedResult);

                jest.clearAllMocks();
            }
        });
    });

    describe('downloadFile', () => {
        it('should execute download query with correct parameters', async () => {
            const bucketName = 'downloads-bucket';
            const key = 'files/document.pdf';
            const mimeType = 'application/pdf';
            const expiration = 1800;
            const expectedResult = { url: 'https://s3.amazonaws.com/signed-download-url' };

            queryBus.execute.mockResolvedValue(expectedResult);

            const result = await controller.downloadFile(bucketName, key, mimeType, expiration);

            expect(queryBus.execute).toHaveBeenCalledWith(
                new GetDownloadUrlQuery(bucketName, key, mimeType, expiration)
            );
            expect(result).toEqual(expectedResult);
        });

        it('should handle different file types for download', async () => {
            const testCases = [
                { key: 'reports/analytics.pdf', mimeType: 'application/pdf' },
                { key: 'images/banner.png', mimeType: 'image/png' },
                { key: 'audio/podcast.mp3', mimeType: 'audio/mpeg' }
            ];

            for (const testCase of testCases) {
                const bucketName = 'media-bucket';
                const expiration = 900;
                const expectedResult = { url: `https://s3.amazonaws.com/${testCase.key}` };

                queryBus.execute.mockResolvedValue(expectedResult);

                const result = await controller.downloadFile(bucketName, testCase.key, testCase.mimeType, expiration);

                expect(queryBus.execute).toHaveBeenCalledWith(
                    new GetDownloadUrlQuery(bucketName, testCase.key, testCase.mimeType, expiration)
                );
                expect(result).toEqual(expectedResult);

                jest.clearAllMocks();
            }
        });
    });
});
