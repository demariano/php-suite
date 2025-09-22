import { AwsS3LibService } from '@aws-s3-lib';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
    let service: AppService;
    let awsS3LibService: jest.Mocked<AwsS3LibService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppService,
                {
                    provide: AwsS3LibService,
                    useValue: {
                        getUploadSignedUrl: jest.fn(),
                        getDownloadSignedUrl: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AppService>(AppService);
        awsS3LibService = module.get(AwsS3LibService) as jest.Mocked<AwsS3LibService>;

        // Mock console.error to avoid noise in tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
        // Mock logger
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('healthCheck', () => {
        it('should return health check data with status and version', () => {
            const result = service.healthCheck();
            expect(result).toHaveProperty('status', 'ok');
            expect(result).toHaveProperty('version');
            expect(typeof result.version).toBe('string');
        });
    });

    describe('getVersion', () => {
        it('should return version data', () => {
            const result = service.getVersion();
            expect(result).toHaveProperty('version');
            expect(typeof result.version).toBe('string');
        });

        it('should return "0.0.0" when version file is not found', () => {
            const result = service.getVersion();
            // Since version.dat doesn't exist in test environment, it should default to '0.0.0'
            expect(result.version).toBe('0.0.0');
        });
    });

    describe('uploadFile', () => {
        it('should generate upload signed URL successfully', async () => {
            const bucketName = 'test-bucket';
            const key = 'uploads/test-file.pdf';
            const mimeType = 'application/pdf';
            const expiration = 3600;
            const expectedUrl = 'https://s3.amazonaws.com/test-bucket/uploads/test-file.pdf?signed-params';

            awsS3LibService.getUploadSignedUrl.mockResolvedValue(expectedUrl);

            const result = await service.uploadFile(bucketName, key, mimeType, expiration);

            expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(bucketName, key, mimeType, expiration);
            expect(result).toBe(expectedUrl);
        });

        it('should handle different file types for upload', async () => {
            const testCases = [
                { key: 'documents/contract.pdf', mimeType: 'application/pdf' },
                { key: 'images/profile.jpg', mimeType: 'image/jpeg' },
                { key: 'videos/demo.mp4', mimeType: 'video/mp4' },
                { key: 'spreadsheets/data.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
            ];

            for (const testCase of testCases) {
                const bucketName = 'uploads-bucket';
                const expiration = 1800;
                const expectedUrl = `https://s3.amazonaws.com/${bucketName}/${testCase.key}?upload-signed`;

                awsS3LibService.getUploadSignedUrl.mockResolvedValue(expectedUrl);

                const result = await service.uploadFile(bucketName, testCase.key, testCase.mimeType, expiration);

                expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(
                    bucketName, testCase.key, testCase.mimeType, expiration
                );
                expect(result).toBe(expectedUrl);

                jest.clearAllMocks();
            }
        });

        it('should handle different expiration times for upload', async () => {
            const bucketName = 'temp-bucket';
            const key = 'temp/file.txt';
            const mimeType = 'text/plain';
            const expirationTimes = [300, 900, 1800, 3600, 7200]; // 5min to 2hrs

            for (const expiration of expirationTimes) {
                const expectedUrl = `https://s3.amazonaws.com/${bucketName}/${key}?expires=${expiration}`;

                awsS3LibService.getUploadSignedUrl.mockResolvedValue(expectedUrl);

                const result = await service.uploadFile(bucketName, key, mimeType, expiration);

                expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(
                    bucketName, key, mimeType, expiration
                );
                expect(result).toBe(expectedUrl);

                jest.clearAllMocks();
            }
        });

        it('should handle complex file paths for upload', async () => {
            const bucketName = 'complex-bucket';
            const key = 'users/123/documents/2024/invoices/invoice-001.pdf';
            const mimeType = 'application/pdf';
            const expiration = 3600;
            const expectedUrl = 'https://s3.amazonaws.com/complex-bucket/users/123/documents/2024/invoices/invoice-001.pdf?signed';

            awsS3LibService.getUploadSignedUrl.mockResolvedValue(expectedUrl);

            const result = await service.uploadFile(bucketName, key, mimeType, expiration);

            expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(bucketName, key, mimeType, expiration);
            expect(result).toBe(expectedUrl);
        });

        it('should handle upload URL generation errors', async () => {
            const bucketName = 'error-bucket';
            const key = 'error/file.txt';
            const mimeType = 'text/plain';
            const expiration = 3600;
            const error = new Error('S3 service unavailable');

            awsS3LibService.getUploadSignedUrl.mockRejectedValue(error);

            await expect(service.uploadFile(bucketName, key, mimeType, expiration)).rejects.toThrow('S3 service unavailable');

            expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(bucketName, key, mimeType, expiration);
        });
    });

    describe('downloadFile', () => {
        it('should generate download signed URL successfully', async () => {
            const bucketName = 'downloads-bucket';
            const key = 'files/document.pdf';
            const mimeType = 'application/pdf';
            const expiration = 1800;
            const expectedUrl = 'https://s3.amazonaws.com/downloads-bucket/files/document.pdf?download-signed';

            awsS3LibService.getDownloadSignedUrl.mockResolvedValue(expectedUrl);

            const result = await service.downloadFile(bucketName, key, mimeType, expiration);

            expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(bucketName, key, mimeType, expiration);
            expect(result).toBe(expectedUrl);
        });

        it('should handle different file types for download', async () => {
            const testCases = [
                { key: 'reports/analytics.pdf', mimeType: 'application/pdf' },
                { key: 'images/banner.png', mimeType: 'image/png' },
                { key: 'audio/podcast.mp3', mimeType: 'audio/mpeg' },
                { key: 'archives/backup.zip', mimeType: 'application/zip' }
            ];

            for (const testCase of testCases) {
                const bucketName = 'media-bucket';
                const expiration = 900;
                const expectedUrl = `https://s3.amazonaws.com/${bucketName}/${testCase.key}?download-token`;

                awsS3LibService.getDownloadSignedUrl.mockResolvedValue(expectedUrl);

                const result = await service.downloadFile(bucketName, testCase.key, testCase.mimeType, expiration);

                expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(
                    bucketName, testCase.key, testCase.mimeType, expiration
                );
                expect(result).toBe(expectedUrl);

                jest.clearAllMocks();
            }
        });

        it('should handle private file downloads', async () => {
            const bucketName = 'private-files';
            const key = 'confidential/user-data/profile-123.json';
            const mimeType = 'application/json';
            const expiration = 300; // Short expiration for sensitive data
            const expectedUrl = 'https://s3.amazonaws.com/private-files/confidential/user-data/profile-123.json?restricted-access';

            awsS3LibService.getDownloadSignedUrl.mockResolvedValue(expectedUrl);

            const result = await service.downloadFile(bucketName, key, mimeType, expiration);

            expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(bucketName, key, mimeType, expiration);
            expect(result).toBe(expectedUrl);
        });

        it('should handle download URL generation errors', async () => {
            const bucketName = 'restricted-bucket';
            const key = 'protected/file.pdf';
            const mimeType = 'application/pdf';
            const expiration = 1800;
            const error = new Error('Access denied to bucket');

            awsS3LibService.getDownloadSignedUrl.mockRejectedValue(error);

            await expect(service.downloadFile(bucketName, key, mimeType, expiration)).rejects.toThrow('Access denied to bucket');

            expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(bucketName, key, mimeType, expiration);
        });

        it('should handle network timeout errors for download', async () => {
            const bucketName = 'timeout-bucket';
            const key = 'large/big-file.zip';
            const mimeType = 'application/zip';
            const expiration = 3600;
            const timeoutError = new Error('Request timeout');
            timeoutError.name = 'TimeoutError';

            awsS3LibService.getDownloadSignedUrl.mockRejectedValue(timeoutError);

            await expect(service.downloadFile(bucketName, key, mimeType, expiration)).rejects.toThrow('Request timeout');
        });
    });

    describe('logging', () => {
        it('should log upload file operations', async () => {
            const logSpy = jest.spyOn(Logger.prototype, 'log');
            const bucketName = 'log-test-bucket';
            const key = 'test-logs/upload.txt';
            const mimeType = 'text/plain';
            const expiration = 1800;

            awsS3LibService.getUploadSignedUrl.mockResolvedValue('mock-url');

            await service.uploadFile(bucketName, key, mimeType, expiration);

            expect(logSpy).toHaveBeenCalledWith(`Uploading file to bucket ${bucketName} with key ${key}`);
        });

        it('should log download file operations', async () => {
            const logSpy = jest.spyOn(Logger.prototype, 'log');
            const bucketName = 'log-test-bucket';
            const key = 'test-logs/download.txt';
            const mimeType = 'text/plain';
            const expiration = 1800;

            awsS3LibService.getDownloadSignedUrl.mockResolvedValue('mock-url');

            await service.downloadFile(bucketName, key, mimeType, expiration);

            expect(logSpy).toHaveBeenCalledWith(`Downloading file from bucket ${bucketName} with key ${key}`);
        });
    });
});
