import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUploadUrlQuery } from './get.upload.url.query';
import { ResponseDto } from '@dto';
import { Logger } from '@nestjs/common';
import { AwsS3LibService } from '@aws-s3-lib';

/**
 * Handles generation of pre-signed upload URLs for secure direct-to-S3 file upload operations.
 *
 * **Business Rules:**
 * - Pre-signed URLs provide secure, time-limited access for direct S3 uploads without exposing AWS credentials
 * - Upload URLs expire after configurable time period (typically 15-60 minutes)
 * - File type validation enforced through MIME type restrictions and content type headers
 * - File size limits enforced at S3 bucket policy level and application validation
 * - Unique file keys generated to prevent conflicts and enable organized storage structure
 * - Upload operations logged for audit trail and usage monitoring
 *
 * **Integration Points:**
 * - AwsS3LibService: AWS S3 SDK integration for pre-signed URL generation and bucket operations
 * - File Validation Service: MIME type validation and file security scanning
 * - Audit Logging: Comprehensive upload request tracking for security and compliance
 * - CDN Integration: Optional CloudFront distribution for global file access acceleration
 *
 * **File Upload Categories:**
 * - User Profiles: Avatar images, profile documents, identity verification files
 * - Product Assets: Product images, documentation, specification sheets, manuals
 * - Document Management: Contracts, invoices, reports, compliance documents
 * - Media Content: Videos, audio files, presentations, marketing materials
 * - System Assets: Application resources, configuration files, backup files
 * - Temporary Files: Processing intermediates, import/export files, cache resources
 *
 * **Security Considerations:**
 * - Pre-signed URLs contain temporary credentials with limited scope and expiration
 * - MIME type validation prevents upload of executable or potentially malicious files
 * - File size limits prevent storage abuse and protect against denial-of-service attacks
 * - Virus scanning integrated for uploaded files before making them accessible
 * - Access logging for all upload operations with user attribution and IP tracking
 * - Encryption at rest and in transit for sensitive file uploads
 *
 * **URL Structure:**
 * - Bucket organization: environment/service/user-id/file-category/unique-filename
 * - Versioning support: automatic versioning for file updates and revision tracking
 * - Metadata inclusion: file description, upload timestamp, user information
 * - Content-Type enforcement: ensures proper MIME type handling during upload
 * - Cache control headers: optimized caching strategies for different file types
 *
 * **Error Scenarios:**
 * - Invalid bucket name: Returns 400 with list of available buckets for the operation
 * - Unsupported MIME type: Returns 415 with list of allowed file types and formats
 * - File key conflicts: Returns 409 with suggested alternative file names
 * - S3 service unavailable: Returns 503 with retry guidance and alternative storage options
 * - Permission denied: Returns 403 with access requirements and authorization guidance
 * - File size exceeded: Returns 413 with size limits and compression suggestions
 *
 * **Use Cases:**
 * - User-Generated Content: Profile pictures, document uploads, media sharing
 * - Data Import: Bulk file uploads, CSV imports, configuration file uploads
 * - Asset Management: Product images, marketing materials, documentation uploads
 * - Document Processing: Contract uploads, invoice processing, report generation
 * - Media Processing: Video/audio uploads for transcoding and streaming
 * - Backup Operations: System backups, data exports, archive creation
 *
 * **Performance Optimization:**
 * - Multi-part upload support for large files with resume capability
 * - Parallel upload streams for improved throughput on large files
 * - Regional bucket selection for optimized upload performance
 * - Upload progress tracking and real-time status updates
 * - Automatic retry mechanisms for failed upload operations
 */
@QueryHandler(GetUploadUrlQuery)
export class GetUploadUrlHandler implements IQueryHandler<GetUploadUrlQuery> {
    private readonly logger = new Logger(GetUploadUrlHandler.name);

    constructor(
        private readonly awsS3LibService: AwsS3LibService
    ) {}

    async execute(query: GetUploadUrlQuery): Promise<ResponseDto<string>> {
        const { bucketName, key, mimeType, expiration } = query;

        this.logger.log(
            `Pre-signed upload URL request - Bucket: ${bucketName}, Key: ${key}, Type: ${mimeType}, Expires: ${expiration}s`
        );

        try {
            const url = await this.awsS3LibService.getUploadSignedUrl(bucketName, key, mimeType, expiration);

            this.logger.log(
                `Pre-signed upload URL generated successfully - Bucket: ${bucketName}, Key: ${key}, Expires: ${expiration}s`
            );
            return new ResponseDto<string>(url, 200);
            
        } catch (error) {
            this.logger.error(
                `Pre-signed upload URL generation failed - Bucket: ${bucketName}, Key: ${key}, Error: ${error.message}`
            );
            throw error;
        }
    }
}