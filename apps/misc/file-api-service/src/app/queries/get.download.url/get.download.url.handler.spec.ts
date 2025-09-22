import { AwsS3LibService } from '@aws-s3-lib';
import { ResponseDto } from '@dto';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GetDownloadUrlHandler } from './get.download.url.handler';
import { GetDownloadUrlQuery } from './get.download.url.query';

describe('GetDownloadUrlHandler', () => {
    let handler: GetDownloadUrlHandler;
    let awsS3LibService: jest.Mocked<AwsS3LibService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetDownloadUrlHandler,
                {
                    provide: AwsS3LibService,
                    useValue: {
                        getDownloadSignedUrl: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<GetDownloadUrlHandler>(GetDownloadUrlHandler);
        awsS3LibService = module.get(AwsS3LibService) as jest.Mocked<AwsS3LibService>;

        // Mock the logger to avoid console output during tests
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should generate download signed URL successfully', async () => {
            const query = new GetDownloadUrlQuery('downloads-bucket', 'files/document.pdf', 'application/pdf', 1800);

            const mockSignedUrl = 'https://s3.amazonaws.com/downloads-bucket/files/document.pdf?download-signed';
            awsS3LibService.getDownloadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(
                'downloads-bucket',
                'files/document.pdf',
                'application/pdf',
                1800
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle different file types for download', async () => {
            const testCases = [
                {
                    query: new GetDownloadUrlQuery('reports-bucket', 'analytics/report.pdf', 'application/pdf', 900),
                    expectedUrl: 'https://s3.amazonaws.com/reports-bucket/analytics/report.pdf?download-signed',
                },
                {
                    query: new GetDownloadUrlQuery('images-bucket', 'photos/banner.png', 'image/png', 600),
                    expectedUrl: 'https://s3.amazonaws.com/images-bucket/photos/banner.png?download-signed',
                },
                {
                    query: new GetDownloadUrlQuery('audio-bucket', 'podcasts/episode-1.mp3', 'audio/mpeg', 1200),
                    expectedUrl: 'https://s3.amazonaws.com/audio-bucket/podcasts/episode-1.mp3?download-signed',
                },
                {
                    query: new GetDownloadUrlQuery('archives-bucket', 'backups/data.zip', 'application/zip', 3600),
                    expectedUrl: 'https://s3.amazonaws.com/archives-bucket/backups/data.zip?download-signed',
                },
            ];

            for (const testCase of testCases) {
                awsS3LibService.getDownloadSignedUrl.mockResolvedValue(testCase.expectedUrl);

                const result = await handler.execute(testCase.query);

                expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(
                    testCase.query.bucketName,
                    testCase.query.key,
                    testCase.query.mimeType,
                    testCase.query.expiration
                );
                expect(result).toEqual(new ResponseDto<string>(testCase.expectedUrl, 200));

                jest.clearAllMocks();
            }
        });

        it('should handle different expiration times', async () => {
            const bucketName = 'timed-downloads';
            const key = 'temporary/session-file.json';
            const mimeType = 'application/json';
            const expirationTimes = [60, 300, 900, 1800, 3600]; // 1min to 1hr

            for (const expiration of expirationTimes) {
                const query = new GetDownloadUrlQuery(bucketName, key, mimeType, expiration);
                const expectedUrl = `https://s3.amazonaws.com/${bucketName}/${key}?expires=${expiration}`;

                awsS3LibService.getDownloadSignedUrl.mockResolvedValue(expectedUrl);

                const result = await handler.execute(query);

                expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(
                    bucketName,
                    key,
                    mimeType,
                    expiration
                );
                expect(result).toEqual(new ResponseDto<string>(expectedUrl, 200));

                jest.clearAllMocks();
            }
        });

        it('should handle private file downloads', async () => {
            const query = new GetDownloadUrlQuery(
                'private-files',
                'confidential/user-data/profile-123.json',
                'application/json',
                300 // Short expiration for sensitive data
            );

            const mockSignedUrl =
                'https://s3.amazonaws.com/private-files/confidential/user-data/profile-123.json?restricted-access';
            awsS3LibService.getDownloadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(
                'private-files',
                'confidential/user-data/profile-123.json',
                'application/json',
                300
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle large file downloads', async () => {
            const query = new GetDownloadUrlQuery(
                'large-files',
                'archives/database-backup-2024.sql.gz',
                'application/gzip',
                10800 // 3 hours for large downloads
            );

            const mockSignedUrl =
                'https://s3.amazonaws.com/large-files/archives/database-backup-2024.sql.gz?extended-download';
            awsS3LibService.getDownloadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(
                'large-files',
                'archives/database-backup-2024.sql.gz',
                'application/gzip',
                10800
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle corporate document downloads', async () => {
            const query = new GetDownloadUrlQuery(
                'corporate-docs',
                'legal/contracts/2024/signed-agreement.pdf',
                'application/pdf',
                7200 // 2 hours for important docs
            );

            const mockSignedUrl =
                'https://s3.amazonaws.com/corporate-docs/legal/contracts/2024/signed-agreement.pdf?corporate-download';
            awsS3LibService.getDownloadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(
                'corporate-docs',
                'legal/contracts/2024/signed-agreement.pdf',
                'application/pdf',
                7200
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle media file downloads', async () => {
            const query = new GetDownloadUrlQuery(
                'media-storage',
                'videos/training/onboarding-2024.mp4',
                'video/mp4',
                5400 // 1.5 hours for video content
            );

            const mockSignedUrl =
                'https://s3.amazonaws.com/media-storage/videos/training/onboarding-2024.mp4?media-download';
            awsS3LibService.getDownloadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(
                'media-storage',
                'videos/training/onboarding-2024.mp4',
                'video/mp4',
                5400
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle AWS S3 service errors gracefully', async () => {
            const query = new GetDownloadUrlQuery('error-bucket', 'error/file.txt', 'text/plain', 1800);

            const error = new Error('AWS S3 service unavailable');
            awsS3LibService.getDownloadSignedUrl.mockRejectedValue(error);

            await expect(handler.execute(query)).rejects.toThrow('AWS S3 service unavailable');

            expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(
                'error-bucket',
                'error/file.txt',
                'text/plain',
                1800
            );
        });

        it('should handle bucket access denied errors', async () => {
            const query = new GetDownloadUrlQuery('restricted-bucket', 'protected/file.pdf', 'application/pdf', 900);

            const accessError = new Error('Access Denied to bucket');
            accessError.name = 'AccessDenied';
            awsS3LibService.getDownloadSignedUrl.mockRejectedValue(accessError);

            await expect(handler.execute(query)).rejects.toThrow('Access Denied to bucket');
        });

        it('should handle file not found errors', async () => {
            const query = new GetDownloadUrlQuery('existing-bucket', 'non-existent/file.pdf', 'application/pdf', 1800);

            const notFoundError = new Error('The specified key does not exist');
            notFoundError.name = 'NoSuchKey';
            awsS3LibService.getDownloadSignedUrl.mockRejectedValue(notFoundError);

            await expect(handler.execute(query)).rejects.toThrow('The specified key does not exist');
        });

        it('should handle network timeout errors', async () => {
            const query = new GetDownloadUrlQuery('timeout-bucket', 'slow/file.zip', 'application/zip', 3600);

            const timeoutError = new Error('Request timeout');
            timeoutError.name = 'TimeoutError';
            awsS3LibService.getDownloadSignedUrl.mockRejectedValue(timeoutError);

            await expect(handler.execute(query)).rejects.toThrow('Request timeout');
        });

        it('should log query execution correctly', async () => {
            const logSpy = jest.spyOn(Logger.prototype, 'log');

            const query = new GetDownloadUrlQuery('log-test-bucket', 'logs/download-test.txt', 'text/plain', 1200);

            const mockSignedUrl = 'https://s3.amazonaws.com/log-test-bucket/logs/download-test.txt?signed';
            awsS3LibService.getDownloadSignedUrl.mockResolvedValue(mockSignedUrl);

            await handler.execute(query);

            expect(logSpy).toHaveBeenCalledWith(
                'Pre-signed download URL request - Bucket: log-test-bucket, Key: logs/download-test.txt, Type: text/plain, Expires: 1200s'
            );
        });

        it('should handle special characters in file keys', async () => {
            const query = new GetDownloadUrlQuery(
                'special-files',
                'documents/report with spaces & symbols!@#.pdf',
                'application/pdf',
                1800
            );

            const mockSignedUrl =
                'https://s3.amazonaws.com/special-files/documents/report%20with%20spaces%20%26%20symbols!@%23.pdf?signed';
            awsS3LibService.getDownloadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(
                'special-files',
                'documents/report with spaces & symbols!@#.pdf',
                'application/pdf',
                1800
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle temporary download links', async () => {
            const query = new GetDownloadUrlQuery(
                'temp-downloads',
                'session-abc123/temp-export.csv',
                'text/csv',
                180 // 3 minutes for temporary exports
            );

            const mockSignedUrl =
                'https://s3.amazonaws.com/temp-downloads/session-abc123/temp-export.csv?temp-download';
            awsS3LibService.getDownloadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(
                'temp-downloads',
                'session-abc123/temp-export.csv',
                'text/csv',
                180
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle archived file downloads', async () => {
            const query = new GetDownloadUrlQuery(
                'archives',
                'yearly-backups/2023/complete-backup.tar.gz',
                'application/gzip',
                14400 // 4 hours for large archive downloads
            );

            const mockSignedUrl =
                'https://s3.amazonaws.com/archives/yearly-backups/2023/complete-backup.tar.gz?archive-download';
            awsS3LibService.getDownloadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(
                'archives',
                'yearly-backups/2023/complete-backup.tar.gz',
                'application/gzip',
                14400
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle user-generated content downloads', async () => {
            const query = new GetDownloadUrlQuery(
                'user-content',
                'users/user-456/uploads/profile-picture.jpg',
                'image/jpeg',
                1800
            );

            const mockSignedUrl =
                'https://s3.amazonaws.com/user-content/users/user-456/uploads/profile-picture.jpg?user-download';
            awsS3LibService.getDownloadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(
                'user-content',
                'users/user-456/uploads/profile-picture.jpg',
                'image/jpeg',
                1800
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle cross-region bucket access', async () => {
            const query = new GetDownloadUrlQuery(
                'eu-west-bucket',
                'international/multilingual-document.pdf',
                'application/pdf',
                2700 // 45 minutes for international access
            );

            const mockSignedUrl =
                'https://s3.eu-west-1.amazonaws.com/eu-west-bucket/international/multilingual-document.pdf?region-download';
            awsS3LibService.getDownloadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getDownloadSignedUrl).toHaveBeenCalledWith(
                'eu-west-bucket',
                'international/multilingual-document.pdf',
                'application/pdf',
                2700
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });
    });
});
