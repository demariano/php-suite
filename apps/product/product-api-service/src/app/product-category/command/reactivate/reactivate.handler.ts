import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ProductCategoryDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductCategoryDatabaseServiceAbstract } from '@product-database-service';
import { ReactivateProductCategoryCommand } from './reactivate.command';

const HTTP_STATUS_OK = 200;

@CommandHandler(ReactivateProductCategoryCommand)
export class ReactivateProductCategoryHandler implements ICommandHandler<ReactivateProductCategoryCommand> {
    protected readonly logger = new Logger(ReactivateProductCategoryHandler.name);

    constructor(
        @Inject('ProductCategoryDatabaseService')
        private readonly productCategoryDatabaseService: ProductCategoryDatabaseServiceAbstract
    ) {}

    async execute(
        command: ReactivateProductCategoryCommand
    ): Promise<ResponseDto<ProductCategoryDto | ErrorResponseDto>> {
        this.logger.log(`Processing reactivate request for product category: ${command.productCategoryId}`);

        try {
            // Check if user has admin permissions
            this.validateUserPermissions(command.user);

            // Fetch existing category
            const existingCategory = await this.productCategoryDatabaseService.findRecordById(
                command.productCategoryId
            );

            if (!existingCategory) {
                throw new NotFoundException(`Product category not found for id ${command.productCategoryId}`);
            }

            // Validate category is INACTIVE
            if (existingCategory.status !== StatusEnum.INACTIVE) {
                throw new BadRequestException(
                    `Cannot reactivate product category with status: ${existingCategory.status}. Only INACTIVE records can be reactivated.`
                );
            }

            // Update status to ACTIVE
            existingCategory.status = StatusEnum.ACTIVE;
            existingCategory.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product category reactivated by ${command.user.username}`
            );

            const updatedCategory = await this.productCategoryDatabaseService.updateRecord(existingCategory);

            this.logger.log(`Product category reactivated successfully: ${command.productCategoryId}`);
            return new ResponseDto<ProductCategoryDto>(updatedCategory, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.productCategoryId);
        }
    }

    private validateUserPermissions(user: UserCognito): void {
        const hasPermission =
            user.roles && (user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN));

        if (!hasPermission) {
            throw new ForbiddenException('Only ADMIN or SUPER_ADMIN can reactivate product categories');
        }
    }

    private handleError(error: unknown, productCategoryId: string): never {
        this.logger.error(`Error reactivating product category ${productCategoryId}:`, error);

        if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
            throw error;
        }

        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new BadRequestException(errorMessage);
    }
}
