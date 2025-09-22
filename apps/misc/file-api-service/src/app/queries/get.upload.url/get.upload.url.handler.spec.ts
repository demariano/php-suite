import { AwsS3LibService } from '@aws-s3-lib';
import { ResponseDto } from '@dto';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GetUploadUrlHandler } from './get.upload.url.handler';
import { GetUploadUrlQuery } from './get.upload.url.query';

describe('GetUploadUrlHandler', () => {
    let handler: GetUploadUrlHandler;
    let awsS3LibService: jest.Mocked<AwsS3LibService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetUploadUrlHandler,
                {
                    provide: AwsS3LibService,
                    useValue: {
                        getUploadSignedUrl: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<GetUploadUrlHandler>(GetUploadUrlHandler);
        awsS3LibService = module.get(AwsS3LibService) as jest.Mocked<AwsS3LibService>;

        // Mock the logger to avoid console output during tests
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should generate upload signed URL successfully', async () => {
            const query = new GetUploadUrlQuery('test-bucket', 'uploads/document.pdf', 'application/pdf', 3600);

            const mockSignedUrl = 'https://s3.amazonaws.com/test-bucket/uploads/document.pdf?signed-params';
            awsS3LibService.getUploadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(
                'test-bucket',
                'uploads/document.pdf',
                'application/pdf',
                3600
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle different file types for upload', async () => {
            const testCases = [
                {
                    query: new GetUploadUrlQuery('docs-bucket', 'contracts/agreement.pdf', 'application/pdf', 1800),
                    expectedUrl: 'https://s3.amazonaws.com/docs-bucket/contracts/agreement.pdf?upload-signed',
                },
                {
                    query: new GetUploadUrlQuery('images-bucket', 'photos/profile.jpg', 'image/jpeg', 900),
                    expectedUrl: 'https://s3.amazonaws.com/images-bucket/photos/profile.jpg?upload-signed',
                },
                {
                    query: new GetUploadUrlQuery('media-bucket', 'videos/demo.mp4', 'video/mp4', 7200),
                    expectedUrl: 'https://s3.amazonaws.com/media-bucket/videos/demo.mp4?upload-signed',
                },
                {
                    query: new GetUploadUrlQuery(
                        'data-bucket',
                        'spreadsheets/report.xlsx',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        3600
                    ),
                    expectedUrl: 'https://s3.amazonaws.com/data-bucket/spreadsheets/report.xlsx?upload-signed',
                },
            ];

            for (const testCase of testCases) {
                awsS3LibService.getUploadSignedUrl.mockResolvedValue(testCase.expectedUrl);

                const result = await handler.execute(testCase.query);

                expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(
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
            const bucketName = 'temp-bucket';
            const key = 'temp/file.txt';
            const mimeType = 'text/plain';
            const expirationTimes = [300, 900, 1800, 3600, 7200]; // 5min to 2hrs

            for (const expiration of expirationTimes) {
                const query = new GetUploadUrlQuery(bucketName, key, mimeType, expiration);
                const expectedUrl = `https://s3.amazonaws.com/${bucketName}/${key}?expires=${expiration}`;

                awsS3LibService.getUploadSignedUrl.mockResolvedValue(expectedUrl);

                const result = await handler.execute(query);

                expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(bucketName, key, mimeType, expiration);
                expect(result).toEqual(new ResponseDto<string>(expectedUrl, 200));

                jest.clearAllMocks();
            }
        });

        it('should handle complex file paths', async () => {
            const query = new GetUploadUrlQuery(
                'enterprise-bucket',
                'departments/hr/policies/2024/employee-handbook-v2.pdf',
                'application/pdf',
                3600
            );

            const mockSignedUrl =
                'https://s3.amazonaws.com/enterprise-bucket/departments/hr/policies/2024/employee-handbook-v2.pdf?signed-complex';
            awsS3LibService.getUploadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(
                'enterprise-bucket',
                'departments/hr/policies/2024/employee-handbook-v2.pdf',
                'application/pdf',
                3600
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle temporary file uploads', async () => {
            const query = new GetUploadUrlQuery(
                'temp-uploads',
                'session-12345/temp-file-abc.tmp',
                'application/octet-stream',
                300 // Short expiration for temp files
            );

            const mockSignedUrl = 'https://s3.amazonaws.com/temp-uploads/session-12345/temp-file-abc.tmp?temp-upload';
            awsS3LibService.getUploadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(
                'temp-uploads',
                'session-12345/temp-file-abc.tmp',
                'application/octet-stream',
                300
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle corporate document uploads', async () => {
            const query = new GetUploadUrlQuery(
                'corporate-docs',
                'legal/contracts/2024/partnership-agreement-final.pdf',
                'application/pdf',
                7200 // Longer expiration for important docs
            );

            const mockSignedUrl =
                'https://s3.amazonaws.com/corporate-docs/legal/contracts/2024/partnership-agreement-final.pdf?corporate-upload';
            awsS3LibService.getUploadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(
                'corporate-docs',
                'legal/contracts/2024/partnership-agreement-final.pdf',
                'application/pdf',
                7200
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle AWS S3 service errors gracefully', async () => {
            const query = new GetUploadUrlQuery('error-bucket', 'error/file.txt', 'text/plain', 3600);

            const error = new Error('AWS S3 service unavailable');
            awsS3LibService.getUploadSignedUrl.mockRejectedValue(error);

            await expect(handler.execute(query)).rejects.toThrow('AWS S3 service unavailable');

            expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(
                'error-bucket',
                'error/file.txt',
                'text/plain',
                3600
            );
        });

        it('should handle bucket access denied errors', async () => {
            const query = new GetUploadUrlQuery('restricted-bucket', 'restricted/file.pdf', 'application/pdf', 1800);

            const accessError = new Error('Access Denied');
            accessError.name = 'AccessDenied';
            awsS3LibService.getUploadSignedUrl.mockRejectedValue(accessError);

            await expect(handler.execute(query)).rejects.toThrow('Access Denied');
        });

        it('should handle invalid bucket name errors', async () => {
            const query = new GetUploadUrlQuery('invalid.bucket.name', 'file.txt', 'text/plain', 3600);

            const bucketError = new Error('Invalid bucket name');
            awsS3LibService.getUploadSignedUrl.mockRejectedValue(bucketError);

            await expect(handler.execute(query)).rejects.toThrow('Invalid bucket name');
        });

        it('should handle network timeout errors', async () => {
            const query = new GetUploadUrlQuery('timeout-bucket', 'large/file.zip', 'application/zip', 3600);

            const timeoutError = new Error('Network timeout');
            timeoutError.name = 'TimeoutError';
            awsS3LibService.getUploadSignedUrl.mockRejectedValue(timeoutError);

            await expect(handler.execute(query)).rejects.toThrow('Network timeout');
        });

        it('should log query execution correctly', async () => {
            const logSpy = jest.spyOn(Logger.prototype, 'log');

            const query = new GetUploadUrlQuery('log-test-bucket', 'logs/test.txt', 'text/plain', 1800);

            const mockSignedUrl = 'https://s3.amazonaws.com/log-test-bucket/logs/test.txt?signed';
            awsS3LibService.getUploadSignedUrl.mockResolvedValue(mockSignedUrl);

            await handler.execute(query);

            expect(logSpy).toHaveBeenCalledWith(
                'Pre-signed upload URL request - Bucket: log-test-bucket, Key: logs/test.txt, Type: text/plain, Expires: 1800s'
            );
        });

        it('should handle large file uploads with extended expiration', async () => {
            const query = new GetUploadUrlQuery(
                'large-files',
                'backups/database-backup.sql.gz',
                'application/gzip',
                14400 // 4 hours for large uploads
            );

            const mockSignedUrl = 'https://s3.amazonaws.com/large-files/backups/database-backup.sql.gz?extended-upload';
            awsS3LibService.getUploadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(
                'large-files',
                'backups/database-backup.sql.gz',
                'application/gzip',
                14400
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle special characters in file keys', async () => {
            const query = new GetUploadUrlQuery(
                'special-chars',
                'files/document with spaces & symbols!@#.pdf',
                'application/pdf',
                3600
            );

            const mockSignedUrl =
                'https://s3.amazonaws.com/special-chars/files/document%20with%20spaces%20%26%20symbols!@%23.pdf?signed';
            awsS3LibService.getUploadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(
                'special-chars',
                'files/document with spaces & symbols!@#.pdf',
                'application/pdf',
                3600
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });

        it('should handle multipart upload scenarios', async () => {
            const query = new GetUploadUrlQuery(
                'multipart-uploads',
                'large-files/video-4k-content.mp4',
                'video/mp4',
                21600 // 6 hours for multipart uploads
            );

            const mockSignedUrl =
                'https://s3.amazonaws.com/multipart-uploads/large-files/video-4k-content.mp4?multipart-upload-id=xyz';
            awsS3LibService.getUploadSignedUrl.mockResolvedValue(mockSignedUrl);

            const result = await handler.execute(query);

            expect(awsS3LibService.getUploadSignedUrl).toHaveBeenCalledWith(
                'multipart-uploads',
                'large-files/video-4k-content.mp4',
                'video/mp4',
                21600
            );
            expect(result).toEqual(new ResponseDto<string>(mockSignedUrl, 200));
        });
    });
});
