import { TermsDatabaseServiceAbstract } from '@customer-database-service';
import { ErrorResponseDto, ResponseDto, StatusEnum, TermsDto, UserRole } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateTermsCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateTermsCommand)
export class CreateTermsHandler implements ICommandHandler<CreateTermsCommand> {
    protected readonly logger = new Logger(CreateTermsHandler.name);

    constructor(
        @Inject('TermsDatabaseService')
        private readonly termsDatabaseService: TermsDatabaseServiceAbstract
    ) {}

    async execute(command: CreateTermsCommand): Promise<ResponseDto<TermsDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for terms: ${command.termsDto.termsName}`);

        try {
            // Validate that terms name doesn't already exist
            await this.validateTermsNameUnique(command.termsDto.termsName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateTermsStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.termsDatabaseService.createRecord(command.termsDto);

            this.logger.log(`Terms created successfully: ${createdRecord.termsId}`);
            return new ResponseDto<TermsDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.termsDto.termsName);
        }
    }

    /**
     * Validates that the terms name is unique
     */
    private async validateTermsNameUnique(termsName: string): Promise<void> {
        const existingRecord = await this.termsDatabaseService.findRecordByName(termsName);

        if (existingRecord) {
            this.logger.warn(`Terms name already exists: ${termsName}`);
            throw new BadRequestException('Terms name already exists');
        }
    }

    /**
     * Checks if user has permission to approve updates directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates terms status and activity logs based on user permissions
     */
    private updateTermsStatus(command: CreateTermsCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.termsDto.status = StatusEnum.ACTIVE;
            command.termsDto.activityLogs = [];
            command.termsDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Terms created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to NEW_RECORD
            command.termsDto.status = StatusEnum.NEW_RECORD;
            command.termsDto.activityLogs = [];
            command.termsDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Terms created by ${command.user.username} for approval`
            );
            command.termsDto.forApprovalVersion = {};
            command.termsDto.forApprovalVersion.termsName = command.termsDto.termsName;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, termsName: string): never {
        this.logger.error(`Error processing create request for ${termsName}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(errorMessage);
    }

    /**
     * Extracts error message from various error types
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'object' && error !== null && 'response' in error) {
            const responseError = error as { response?: { body?: { errorMessage?: string } } };
            return responseError.response?.body?.errorMessage || 'Unknown error occurred';
        }

        return 'An unexpected error occurred';
    }
}
