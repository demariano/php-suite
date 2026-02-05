import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ProductDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProductDatabaseServiceAbstract } from '@product-database-service';
import { ReactivateProductCommand } from './reactivate.command';

const HTTP_STATUS_OK = 200;

@CommandHandler(ReactivateProductCommand)
export class ReactivateProductHandler implements ICommandHandler<ReactivateProductCommand> {
    protected readonly logger = new Logger(ReactivateProductHandler.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseServiceAbstract
    ) {}

    async execute(command: ReactivateProductCommand): Promise<ResponseDto<ProductDto | ErrorResponseDto>> {
        this.logger.log(`Processing reactivate request for product: ${command.productId}`);

        try {
            // Check if user has admin permissions
            this.validateUserPermissions(command.user);

            // Fetch existing product
            const existingProduct = await this.productDatabaseService.findRecordById(command.productId);

            if (!existingProduct) {
                throw new NotFoundException(`Product not found for id ${command.productId}`);
            }

            // Validate product is INACTIVE
            if (existingProduct.status !== StatusEnum.INACTIVE) {
                throw new BadRequestException(
                    `Cannot reactivate product with status: ${existingProduct.status}. Only INACTIVE records can be reactivated.`
                );
            }

            // Update status to ACTIVE
            existingProduct.status = StatusEnum.ACTIVE;
            existingProduct.activityLogs = existingProduct.activityLogs || [];
            existingProduct.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Product reactivated by ${command.user.username}`
            );

            const updatedProduct = await this.productDatabaseService.updateRecord(existingProduct);

            this.logger.log(`Product reactivated successfully: ${command.productId}`);
            return new ResponseDto<ProductDto>(updatedProduct, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.productId);
        }
    }

    private validateUserPermissions(user: UserCognito): void {
        const hasPermission =
            user.roles && (user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN));

        if (!hasPermission) {
            throw new ForbiddenException('Only ADMIN or SUPER_ADMIN can reactivate products');
        }
    }

    private handleError(error: unknown, productId: string): never {
        this.logger.error(`Error reactivating product ${productId}:`, error);

        if (
            error instanceof NotFoundException ||
            error instanceof BadRequestException ||
            error instanceof ForbiddenException
        ) {
            throw error;
        }

        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new BadRequestException(errorMessage);
    }
}
