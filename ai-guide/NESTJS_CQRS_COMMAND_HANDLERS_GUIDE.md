# AI Guide: NestJS CQRS Command Handlers Implementation

## Table of Contents
1. [Overview](#overview)
2. [Handler Structure](#handler-structure)
3. [Create Handler](#create-handler)
4. [Update Handler](#update-handler)
5. [Delete Handler](#delete-handler)
6. [Approve Handler](#approve-handler)
7. [Deny Handler](#deny-handler)
8. [Common Patterns](#common-patterns)
9. [Validation & Error Handling](#validation--error-handling)
10. [Complete Examples](#complete-examples)

---

## Overview

Command handlers contain the business logic for executing commands. They validate inputs, check permissions, apply business rules, and interact with the database service.

**Key Responsibilities:**
- Execute business logic
- Validate data and permissions
- Manage status transitions
- Handle approval workflows
- Track activity logs
- Detect and format field changes
- Return standardized responses

**Pattern:**
```typescript
@CommandHandler(CommandClass)
export class Handler implements ICommandHandler<CommandClass> {
    protected readonly logger = new Logger(Handler.name);
    
    constructor(
        @Inject('DatabaseService')
        private readonly databaseService: DatabaseServiceAbstract
    ) {}
    
    async execute(command: CommandClass): Promise<ResponseDto<EntityDto>> {
        // Business logic here
    }
}
```

---

## Handler Structure

### Basic Template

```typescript
import { DatabaseServiceAbstract } from '@entity-database-service';
import { EntityDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateEntityCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateEntityCommand)
export class CreateEntityHandler implements ICommandHandler<CreateEntityCommand> {
    protected readonly logger = new Logger(CreateEntityHandler.name);

    constructor(
        @Inject('EntityDatabaseService')
        private readonly entityDatabaseService: EntityDatabaseServiceAbstract
    ) {}

    async execute(command: CreateEntityCommand): Promise<ResponseDto<EntityDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for entity: ${command.entityDto.entityName}`);

        try {
            // Validation
            // Business logic
            // Database operation
            // Return response
        } catch (error) {
            return this.handleError(error, command.entityDto.entityName);
        }
    }

    private hasApprovalPermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) {
            return false;
        }
        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    private handleError(error: unknown, entityName: string): never {
        this.logger.error(`Error processing create request for ${entityName}:`, error);
        
        if (error instanceof BadRequestException) {
            throw error;
        }
        
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(errorMessage);
    }

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
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `@CommandHandler` | Registers handler with CQRS module |
| `ICommandHandler` | Interface for type safety |
| `Logger` | NestJS logger for debugging and audit |
| `@Inject` | Dependency injection for database service |
| Constants | HTTP status codes, limits |
| `execute()` | Main handler method |
| Private helper methods | Validation, permission checks, error handling |

---

## Create Handler

### Business Logic Flow

```
1. Log request
2. Validate unique fields (name doesn't exist)
3. Check user permissions
4. Set status based on role:
   - ADMIN/SUPER_ADMIN → ACTIVE
   - USER → NEW_RECORD
5. Populate activity logs
6. Populate forApprovalVersion (for non-admins)
7. Create record in database
8. Return response
```

### Complete Implementation

```typescript
import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateCustomerCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateCustomerCommand)
export class CreateCustomerHandler implements ICommandHandler<CreateCustomerCommand> {
    protected readonly logger = new Logger(CreateCustomerHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(command: CreateCustomerCommand): Promise<ResponseDto<CustomerDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for customer: ${command.customerDto.customerName}`);

        try {
            // Validate that customer name doesn't already exist
            await this.validateCustomerNameUnique(command.customerDto.customerName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateCustomerStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.customerDatabaseService.createRecord(command.customerDto);

            this.logger.log(`Customer created successfully: ${createdRecord.customerId}`);
            return new ResponseDto<CustomerDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.customerDto.customerName);
        }
    }

    /**
     * Validates that the customer name is unique
     */
    private async validateCustomerNameUnique(customerName: string): Promise<void> {
        const existingRecord = await this.customerDatabaseService.findRecordByName(customerName);

        if (existingRecord) {
            this.logger.warn(`Customer name already exists: ${customerName}`);
            throw new BadRequestException('Customer name already exists');
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
     * Updates customer status and activity logs based on user permissions
     */
    private updateCustomerStatus(command: CreateCustomerCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.customerDto.status = StatusEnum.ACTIVE;
            command.customerDto.activityLogs = [];
            command.customerDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );

            // Limit activity logs to last 10 entries
            command.customerDto.activityLogs = reduceArrayContents(
                command.customerDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
        } else {
            // User needs approval - set to NEW_RECORD
            command.customerDto.status = StatusEnum.NEW_RECORD;
            command.customerDto.activityLogs = [];
            command.customerDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer created by ${command.user.username} for approval`
            );

            // Limit activity logs to last 10 entries
            command.customerDto.activityLogs = reduceArrayContents(
                command.customerDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );

            // Set the forApprovalVersion with all field values
            command.customerDto.forApprovalVersion = {};
            command.customerDto.forApprovalVersion.customerName = command.customerDto.customerName;
            command.customerDto.forApprovalVersion.email = command.customerDto.email;
            command.customerDto.forApprovalVersion.address1 = command.customerDto.address1;
            command.customerDto.forApprovalVersion.address2 = command.customerDto.address2;
            command.customerDto.forApprovalVersion.balance = command.customerDto.balance;
            command.customerDto.forApprovalVersion.contactNo = command.customerDto.contactNo;
            command.customerDto.forApprovalVersion.contactPerson = command.customerDto.contactPerson;
            command.customerDto.forApprovalVersion.townId = command.customerDto.townId;
            command.customerDto.forApprovalVersion.townName = command.customerDto.townName;
            command.customerDto.forApprovalVersion.creditLimit = command.customerDto.creditLimit;
            command.customerDto.forApprovalVersion.customerCredit = command.customerDto.customerCredit;
            command.customerDto.forApprovalVersion.tinNumber = command.customerDto.tinNumber;
            command.customerDto.forApprovalVersion.areaId = command.customerDto.areaId;
            command.customerDto.forApprovalVersion.areaName = command.customerDto.areaName;
            command.customerDto.forApprovalVersion.customerClassificationId =
                command.customerDto.customerClassificationId;
            command.customerDto.forApprovalVersion.customerClassificationName =
                command.customerDto.customerClassificationName;
            command.customerDto.forApprovalVersion.customerTypeId = command.customerDto.customerTypeId;
            command.customerDto.forApprovalVersion.customerTypeName = command.customerDto.customerTypeName;
            command.customerDto.forApprovalVersion.customerTerms = command.customerDto.customerTerms;
            command.customerDto.forApprovalVersion.customerProductDeals = command.customerDto.customerProductDeals;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerName: string): never {
        this.logger.error(`Error processing create request for ${customerName}:`, error);

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
```

### Key Points

**For ADMIN/SUPER_ADMIN:**
- Status: `ACTIVE`
- Activity log: "Customer created by {username}, status set to ACTIVE"
- NO forApprovalVersion

**For USER:**
- Status: `NEW_RECORD`
- Activity log: "Customer created by {username} for approval"
- Populate forApprovalVersion with ALL field values

---

## Update Handler

### Business Logic Flow

```
1. Log request
2. Check record exists
3. Check user permissions
4. If ADMIN/SUPER_ADMIN:
   - Apply changes directly to main fields
   - Set status to ACTIVE
   - Clear changeReason
   - Update record
5. If USER:
   - Keep original values in main fields
   - Store new values in forApprovalVersion
   - Set status to FOR_APPROVAL
   - Detect field changes
   - Combine user changeReason with auto-detected changes
   - Update record
6. Return response
```

### Complete Implementation

```typescript
import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateCustomerCommand } from './update.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateCustomerCommand)
export class UpdateCustomerHandler implements ICommandHandler<UpdateCustomerCommand> {
    protected readonly logger = new Logger(UpdateCustomerHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateCustomerCommand): Promise<ResponseDto<CustomerDto>> {
        this.logger.log(`Processing update request for customer: ${command.customerId}`);

        try {
            // Check if customer exists
            const existingCustomer = await this.customerDatabaseService.findRecordById(command.customerId);
            if (!existingCustomer) {
                throw new NotFoundException(`Customer not found for ID: ${command.customerId}`);
            }

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateCustomerStatus(command, hasApprovalPermission, existingCustomer);

            // Update record in database
            const recordToUpdate = hasApprovalPermission ? command.customerDto : existingCustomer;
            const updatedRecord = await this.customerDatabaseService.updateRecord(recordToUpdate);

            this.logger.log(`Customer updated successfully: ${command.customerId}`);
            return new ResponseDto<CustomerDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.customerId);
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
     * Updates customer status and activity logs based on user permissions
     */
    private updateCustomerStatus(
        command: UpdateCustomerCommand,
        hasApprovalPermission: boolean,
        existingCustomer: CustomerDto
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE and apply new values to main fields
            command.customerDto.status = StatusEnum.ACTIVE;
            command.customerDto.activityLogs = existingCustomer.activityLogs || [];
            command.customerDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );

            // Limit activity logs to last 10 entries
            command.customerDto.activityLogs = reduceArrayContents(
                command.customerDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );

            // Clear changeReason for admin users since changes are applied directly
            command.customerDto.changeReason = undefined;
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingCustomer.status = StatusEnum.FOR_APPROVAL;
            existingCustomer.activityLogs = existingCustomer.activityLogs || [];

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingCustomer, command.customerDto, {
                arrayIdFields: {
                    customerTerms: 'termsId',
                    customerProductDeals: 'productDealId',
                },
            });
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingCustomer.activityLogs.push(activityLogMessage);

            // Limit activity logs to last 10 entries
            existingCustomer.activityLogs = reduceArrayContents(existingCustomer.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Preserve user's manually entered changeReason and combine with auto-generated changes
            const userChangeReason = command.customerDto.changeReason?.trim();
            if (userChangeReason && formattedChanges) {
                // User provided changeReason and we have formatted changes - combine them
                existingCustomer.changeReason = `${userChangeReason}${formattedChanges}`;
            } else if (userChangeReason) {
                // User provided changeReason but no formatted changes - use user's input
                existingCustomer.changeReason = userChangeReason;
            } else if (formattedChanges) {
                // No user input but we have formatted changes - use formatted changes
                existingCustomer.changeReason = formattedChanges;
            } else {
                // No user input and no formatted changes
                existingCustomer.changeReason = undefined;
            }

            // Store new values in forApprovalVersion (keep original values in main fields)
            existingCustomer.forApprovalVersion = {
                ...existingCustomer.forApprovalVersion,
                customerName: command.customerDto.customerName,
                email: command.customerDto.email,
                address1: command.customerDto.address1,
                address2: command.customerDto.address2,
                balance: command.customerDto.balance,
                contactNo: command.customerDto.contactNo,
                contactPerson: command.customerDto.contactPerson,
                townId: command.customerDto.townId,
                townName: command.customerDto.townName,
                creditLimit: command.customerDto.creditLimit,
                customerCredit: command.customerDto.customerCredit,
                tinNumber: command.customerDto.tinNumber,
                areaId: command.customerDto.areaId,
                areaName: command.customerDto.areaName,
                customerClassificationId: command.customerDto.customerClassificationId,
                customerClassificationName: command.customerDto.customerClassificationName,
                customerTypeId: command.customerDto.customerTypeId,
                customerTypeName: command.customerDto.customerTypeName,
                customerTerms: command.customerDto.customerTerms,
                customerProductDeals: command.customerDto.customerProductDeals,
            };
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerId: string): never {
        this.logger.error(`Error processing update request for customer ${customerId}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
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
```

### Key Points

**For ADMIN/SUPER_ADMIN:**
- Apply changes directly to `command.customerDto`
- Status: `ACTIVE`
- Clear `changeReason` (undefined)
- Update `command.customerDto`

**For USER:**
- Keep original values in `existingCustomer` main fields
- Store new values in `existingCustomer.forApprovalVersion`
- Status: `FOR_APPROVAL`
- Detect changes with `detectFieldChanges`
- Format changes with `formatFieldChanges`
- Combine user `changeReason` with formatted changes
- Update `existingCustomer`

---

## Delete Handler

### Business Logic Flow

```
1. Log request
2. Check record exists
3. Check user permissions
4. If ADMIN/SUPER_ADMIN:
   - Hard delete record from database
   - Return deleted record
5. If USER:
   - Set status to FOR_DELETION
   - Add activity log
   - Update record (don't delete)
   - Return updated record
6. Return response
```

### Complete Implementation

```typescript
import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteCustomerCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteCustomerCommand)
export class DeleteCustomerHandler implements ICommandHandler<DeleteCustomerCommand> {
    protected readonly logger = new Logger(DeleteCustomerHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteCustomerCommand): Promise<ResponseDto<CustomerDto>> {
        this.logger.log(`Processing delete request for customer: ${command.customerId}`);

        try {
            // Check if customer exists
            const existingCustomer = await this.customerDatabaseService.findRecordById(command.customerId);
            if (!existingCustomer) {
                throw new NotFoundException(`Customer not found for ID: ${command.customerId}`);
            }

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateCustomerStatus(command, hasApprovalPermission, existingCustomer);

            // Update or delete record in database
            if (hasApprovalPermission) {
                const deletedRecord = await this.customerDatabaseService.deleteRecord(command.customerDto);
                return new ResponseDto<CustomerDto>(deletedRecord, HTTP_STATUS_OK);
            } else {
                const updatedRecord = await this.customerDatabaseService.updateRecord(command.customerDto);
                return new ResponseDto<CustomerDto>(updatedRecord, HTTP_STATUS_OK);
            }
        } catch (error) {
            return this.handleError(error, command.customerId);
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
     * Updates customer status and activity logs based on user permissions
     */
    private updateCustomerStatus(
        command: DeleteCustomerCommand,
        hasApprovalPermission: boolean,
        existingCustomer: CustomerDto
    ): void {
        if (hasApprovalPermission) {
            // User can delete directly
            command.customerDto.status = StatusEnum.FOR_DELETION;
            command.customerDto.activityLogs = existingCustomer.activityLogs || [];
            command.customerDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer deleted by ${command.user.username}, status set to ${StatusEnum.FOR_DELETION}`
            );

            // Limit activity logs to last 10 entries
            command.customerDto.activityLogs = reduceArrayContents(
                command.customerDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
        } else {
            // User needs approval - set to FOR_DELETION
            command.customerDto.status = StatusEnum.FOR_DELETION;
            command.customerDto.activityLogs = existingCustomer.activityLogs || [];
            command.customerDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer deletion requested by ${command.user.username} for approval`
            );

            // Limit activity logs to last 10 entries
            command.customerDto.activityLogs = reduceArrayContents(
                command.customerDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerId: string): never {
        this.logger.error(`Error processing delete request for customer ${customerId}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
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
```

### Key Points

**For ADMIN/SUPER_ADMIN:**
- Actually delete the record
- Call `databaseService.deleteRecord()`

**For USER:**
- Mark as `FOR_DELETION`
- Don't actually delete
- Call `databaseService.updateRecord()`

---

## Approve Handler

### Business Logic Flow

```
1. Log request
2. Check record exists
3. Validate user has ADMIN/SUPER_ADMIN role
4. Check current status:
   - NEW_RECORD → Apply forApprovalVersion, delete old data, set to ACTIVE
   - FOR_APPROVAL → Apply forApprovalVersion, set to ACTIVE
   - FOR_DELETION → Hard delete record
5. Update activity logs
6. Clear forApprovalVersion and changeReason
7. Save or delete record
8. Return response
```

### Complete Implementation

```typescript
import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, ResponseDto, StatusEnum } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveCustomerCommand } from './approve.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(ApproveCustomerCommand)
export class ApproveCustomerHandler implements ICommandHandler<ApproveCustomerCommand> {
    protected readonly logger = new Logger(ApproveCustomerHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveCustomerCommand): Promise<ResponseDto<CustomerDto>> {
        this.logger.log(`Processing approve request for customer: ${command.customerId}`);

        try {
            // Check if customer exists
            const existingCustomer = await this.customerDatabaseService.findRecordById(command.customerId);
            if (!existingCustomer) {
                throw new NotFoundException(`Customer not found for ID: ${command.customerId}`);
            }

            // Check user authorization
            this.validateUserPermissions(command.user);

            // Update customer status based on current status
            const updatedCustomer = await this.updateCustomerStatus(command, existingCustomer);

            this.logger.log(`Customer approved successfully: ${command.customerId}`);
            return new ResponseDto<CustomerDto>(updatedCustomer, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.customerId);
        }
    }

    /**
     * Validates user permissions for approval
     */
    private validateUserPermissions(user: any): void {
        if (!user.roles || user.roles.length === 0) {
            throw new ForbiddenException('Insufficient permissions to approve customer');
        }

        const hasPermission = user.roles.includes('SUPER_ADMIN') || user.roles.includes('ADMIN');
        if (!hasPermission) {
            throw new ForbiddenException('Insufficient permissions to approve customer');
        }
    }

    /**
     * Updates customer status based on current status
     */
    private async updateCustomerStatus(
        command: ApproveCustomerCommand,
        existingCustomer: CustomerDto
    ): Promise<CustomerDto> {
        const updatedCustomer = { ...existingCustomer };

        // Update activity logs
        updatedCustomer.activityLogs = existingCustomer.activityLogs || [];
        updatedCustomer.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer approved by ${command.user.username}`
        );

        // Limit activity logs to last 10 entries
        updatedCustomer.activityLogs = reduceArrayContents(updatedCustomer.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update status based on current status
        if (existingCustomer.status === StatusEnum.NEW_RECORD) {
            updatedCustomer.status = StatusEnum.ACTIVE;
            // Apply forApprovalVersion if it exists
            if (existingCustomer.forApprovalVersion) {
                Object.assign(updatedCustomer, existingCustomer.forApprovalVersion);
                updatedCustomer.forApprovalVersion = undefined;
            }
            // Reset changeReason after applying changes
            updatedCustomer.changeReason = null;
        } else if (existingCustomer.status === StatusEnum.FOR_APPROVAL) {
            updatedCustomer.status = StatusEnum.ACTIVE;
            // Apply forApprovalVersion if it exists
            if (existingCustomer.forApprovalVersion) {
                Object.assign(updatedCustomer, existingCustomer.forApprovalVersion);
                updatedCustomer.forApprovalVersion = undefined;
            }
            // Reset changeReason after applying changes
            updatedCustomer.changeReason = null;
        } else if (existingCustomer.status === StatusEnum.FOR_DELETION) {
            return await this.customerDatabaseService.deleteRecord(updatedCustomer);
        }

        // Update record in database
        return await this.customerDatabaseService.updateRecord(updatedCustomer);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerId: string): never {
        this.logger.error(`Error processing approve request for customer ${customerId}:`, error);

        // Re-throw known exceptions
        if (error instanceof ForbiddenException || error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
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
```

### Key Points

**Status Transitions:**
- `NEW_RECORD` → `ACTIVE` (apply forApprovalVersion, update record)
- `FOR_APPROVAL` → `ACTIVE` (apply forApprovalVersion, update record)
- `FOR_DELETION` → Delete record

**Always:**
- Validate admin permissions with `ForbiddenException`
- Apply forApprovalVersion using `Object.assign()`
- Clear forApprovalVersion (undefined)
- Clear changeReason (null)

---

## Deny Handler

### Business Logic Flow

```
1. Log request
2. Check record exists
3. Validate user has ADMIN/SUPER_ADMIN role
4. Check current status:
   - NEW_RECORD → Hard delete record (reject creation)
   - FOR_APPROVAL → Revert to ACTIVE, clear forApprovalVersion
   - FOR_DELETION → Revert to ACTIVE
5. Update activity logs
6. Clear forApprovalVersion and changeReason
7. Save or delete record
8. Return response
```

### Complete Implementation

```typescript
import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, ResponseDto, StatusEnum } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyCustomerCommand } from './deny.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DenyCustomerCommand)
export class DenyCustomerHandler implements ICommandHandler<DenyCustomerCommand> {
    protected readonly logger = new Logger(DenyCustomerHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(command: DenyCustomerCommand): Promise<ResponseDto<CustomerDto>> {
        this.logger.log(`Processing deny request for customer: ${command.customerId}`);

        try {
            // Check if customer exists
            const existingCustomer = await this.customerDatabaseService.findRecordById(command.customerId);
            if (!existingCustomer) {
                throw new NotFoundException(`Customer not found for ID: ${command.customerId}`);
            }

            // Check user authorization
            this.validateUserPermissions(command.user);

            // Update customer status based on current status
            const updatedCustomer = await this.updateCustomerStatus(command, existingCustomer);

            this.logger.log(`Customer denied successfully: ${command.customerId}`);
            return new ResponseDto<CustomerDto>(updatedCustomer, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.customerId);
        }
    }

    /**
     * Validates user permissions for denial
     */
    private validateUserPermissions(user: any): void {
        if (!user.roles || user.roles.length === 0) {
            throw new ForbiddenException('Insufficient permissions to deny customer');
        }

        const hasPermission = user.roles.includes('SUPER_ADMIN') || user.roles.includes('ADMIN');
        if (!hasPermission) {
            throw new ForbiddenException('Insufficient permissions to deny customer');
        }
    }

    /**
     * Updates customer status based on current status
     */
    private async updateCustomerStatus(
        command: DenyCustomerCommand,
        existingCustomer: CustomerDto
    ): Promise<CustomerDto> {
        const updatedCustomer = { ...existingCustomer };

        // Update activity logs
        updatedCustomer.activityLogs = existingCustomer.activityLogs || [];
        updatedCustomer.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer denied by ${command.user.username}`
        );

        // Limit activity logs to last 10 entries
        updatedCustomer.activityLogs = reduceArrayContents(updatedCustomer.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update status based on current status
        if (existingCustomer.status === StatusEnum.NEW_RECORD) {
            return await this.customerDatabaseService.deleteRecord(updatedCustomer);
        } else if (existingCustomer.status === StatusEnum.FOR_APPROVAL) {
            // Revert to previous status
            updatedCustomer.status = StatusEnum.ACTIVE;
            // Clear forApprovalVersion
            updatedCustomer.forApprovalVersion = undefined;
            // Reset changeReason
            updatedCustomer.changeReason = null;
        } else if (existingCustomer.status === StatusEnum.FOR_DELETION) {
            // Revert deletion request
            updatedCustomer.status = StatusEnum.ACTIVE;
        }

        // Update record in database
        return await this.customerDatabaseService.updateRecord(updatedCustomer);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerId: string): never {
        this.logger.error(`Error processing deny request for customer ${customerId}:`, error);

        // Re-throw known exceptions
        if (error instanceof ForbiddenException || error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
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
```

### Key Points

**Status Transitions:**
- `NEW_RECORD` → Delete record (reject creation)
- `FOR_APPROVAL` → `ACTIVE` (clear forApprovalVersion, keep original values)
- `FOR_DELETION` → `ACTIVE` (cancel deletion)

**Always:**
- Validate admin permissions with `ForbiddenException`
- Clear forApprovalVersion (undefined)
- Clear changeReason (null)

---

## Common Patterns

### Permission Check Method

```typescript
private hasApprovalPermission(userRoles?: string[]): boolean {
    if (!userRoles || userRoles.length === 0) {
        return false;
    }
    return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
}
```

### Activity Log Addition

```typescript
dto.activityLogs = existingRecord?.activityLogs || [];
dto.activityLogs.push(
    `Date: ${new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
    })}, {action description}`
);
dto.activityLogs = reduceArrayContents(dto.activityLogs, ACTIVITY_LOGS_LIMIT);
```

### Change Detection

```typescript
const fieldChanges = detectFieldChanges(existingRecord, newRecord, {
    arrayIdFields: {
        customerTerms: 'termsId',
        customerProductDeals: 'productDealId',
    },
});
const formattedChanges = formatFieldChanges(fieldChanges);
```

### forApprovalVersion Population

```typescript
existingRecord.forApprovalVersion = {
    ...existingRecord.forApprovalVersion,
    field1: newRecord.field1,
    field2: newRecord.field2,
    // ... all modified fields
};
```

---

## Validation & Error Handling

### Standard Validations

```typescript
// Check record exists
const existingRecord = await this.databaseService.findRecordById(id);
if (!existingRecord) {
    throw new NotFoundException(`Record not found for ID: ${id}`);
}

// Check unique field
const duplicateRecord = await this.databaseService.findRecordByName(name);
if (duplicateRecord) {
    throw new BadRequestException('Name already exists');
}

// Check permissions
if (!user.roles || user.roles.length === 0) {
    throw new ForbiddenException('Insufficient permissions');
}

const hasPermission = user.roles.includes('SUPER_ADMIN') || user.roles.includes('ADMIN');
if (!hasPermission) {
    throw new ForbiddenException('Insufficient permissions to perform this action');
}
```

### Error Handling Pattern

```typescript
private handleError(error: unknown, identifier: string): never {
    this.logger.error(`Error processing request for ${identifier}:`, error);

    // Re-throw known exceptions
    if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
    ) {
        throw error;
    }

    // Handle unknown errors
    const errorMessage = this.extractErrorMessage(error);
    throw new BadRequestException(errorMessage);
}

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
```

---

## Complete Examples

See the complete handler implementations above for:
- Create Handler
- Update Handler
- Delete Handler
- Approve Handler
- Deny Handler

---

## Summary

**Command Handler Checklist:**

- [ ] Add @CommandHandler decorator with command class
- [ ] Implement ICommandHandler interface
- [ ] Create logger instance
- [ ] Inject database service with @Inject
- [ ] Define constants (HTTP_STATUS_*, ACTIVITY_LOGS_LIMIT)
- [ ] Implement execute() method with try-catch
- [ ] Add logging at start and end
- [ ] Validate inputs (record exists, unique fields, permissions)
- [ ] Check user permissions (hasApprovalPermission)
- [ ] Implement role-based business logic
- [ ] Manage status transitions
- [ ] Handle forApprovalVersion
- [ ] Detect and format field changes (update handler)
- [ ] Update activity logs
- [ ] Return ResponseDto
- [ ] Implement error handling methods
- [ ] Add JSDoc comments for private methods

**Key Principles:**
- ✅ Always validate before executing
- ✅ Check permissions for every operation
- ✅ Use constants for status codes and limits
- ✅ Log all operations for audit trail
- ✅ Handle errors gracefully
- ✅ Return standardized ResponseDto
- ✅ Follow role-based workflows consistently

---

**Next Steps:**
- Review [Queries Guide](./NESTJS_CQRS_QUERIES_GUIDE.md) for query patterns
- Study [Query Handlers Guide](./NESTJS_CQRS_QUERY_HANDLERS_GUIDE.md) for data retrieval
- Examine [Controllers Guide](./NESTJS_CQRS_CONTROLLERS_GUIDE.md) for API integration
