import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, CustomerProductDealDto, ResponseDto, StatusEnum, TermsDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
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
            const updatedRecord = await this.customerDatabaseService.updateRecord(command.customerDto);

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
            // User can approve directly - set to ACTIVE
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
        } else {
            // User needs approval - set to FOR_APPROVAL
            command.customerDto.status = StatusEnum.FOR_APPROVAL;
            command.customerDto.activityLogs = existingCustomer.activityLogs || [];

            // Detect field changes
            const fieldChanges = this.detectFieldChanges(existingCustomer, command.customerDto);
            const formattedChanges = this.formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            command.customerDto.activityLogs.push(activityLogMessage);

            // Limit activity logs to last 10 entries
            command.customerDto.activityLogs = reduceArrayContents(
                command.customerDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );

            // Append changes to changeReason if it exists
            if (command.customerDto.changeReason) {
                command.customerDto.changeReason += formattedChanges ? ` | ${formattedChanges}` : '';
            } else if (formattedChanges) {
                command.customerDto.changeReason = formattedChanges;
            }

            // Set the forApprovalVersion
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
     * Detects field changes between existing customer and update request
     */
    private detectFieldChanges(existingCustomer: CustomerDto, updatedCustomer: CustomerDto): string[] {
        const changes: string[] = [];

        // Compare simple string/number fields
        this.compareSimpleField('customerName', existingCustomer.customerName, updatedCustomer.customerName, changes);
        this.compareSimpleField('email', existingCustomer.email, updatedCustomer.email, changes);
        this.compareSimpleField('address1', existingCustomer.address1, updatedCustomer.address1, changes);
        this.compareSimpleField('address2', existingCustomer.address2, updatedCustomer.address2, changes);
        this.compareSimpleField('balance', existingCustomer.balance, updatedCustomer.balance, changes);
        this.compareSimpleField('contactNo', existingCustomer.contactNo, updatedCustomer.contactNo, changes);
        this.compareSimpleField(
            'contactPerson',
            existingCustomer.contactPerson,
            updatedCustomer.contactPerson,
            changes
        );
        this.compareSimpleField('townId', existingCustomer.townId, updatedCustomer.townId, changes);
        this.compareSimpleField('townName', existingCustomer.townName, updatedCustomer.townName, changes);
        this.compareSimpleField('creditLimit', existingCustomer.creditLimit, updatedCustomer.creditLimit, changes);
        this.compareSimpleField(
            'customerCredit',
            existingCustomer.customerCredit,
            updatedCustomer.customerCredit,
            changes
        );
        this.compareSimpleField('tinNumber', existingCustomer.tinNumber, updatedCustomer.tinNumber, changes);
        this.compareSimpleField('areaId', existingCustomer.areaId, updatedCustomer.areaId, changes);
        this.compareSimpleField('areaName', existingCustomer.areaName, updatedCustomer.areaName, changes);
        this.compareSimpleField(
            'customerClassificationId',
            existingCustomer.customerClassificationId,
            updatedCustomer.customerClassificationId,
            changes
        );
        this.compareSimpleField(
            'customerClassificationName',
            existingCustomer.customerClassificationName,
            updatedCustomer.customerClassificationName,
            changes
        );
        this.compareSimpleField(
            'customerTypeId',
            existingCustomer.customerTypeId,
            updatedCustomer.customerTypeId,
            changes
        );
        this.compareSimpleField(
            'customerTypeName',
            existingCustomer.customerTypeName,
            updatedCustomer.customerTypeName,
            changes
        );

        // Compare array fields
        const customerTermsChange = this.compareArrayFields(
            'customerTerms',
            existingCustomer.customerTerms,
            updatedCustomer.customerTerms,
            'termsId'
        );
        if (customerTermsChange) {
            changes.push(customerTermsChange);
        }

        const customerProductDealsChange = this.compareArrayFields(
            'customerProductDeals',
            existingCustomer.customerProductDeals,
            updatedCustomer.customerProductDeals,
            'productDealId'
        );
        if (customerProductDealsChange) {
            changes.push(customerProductDealsChange);
        }

        return changes;
    }

    /**
     * Compares a simple field (string/number) and adds to changes array if different
     */
    private compareSimpleField(
        fieldName: string,
        oldValue: string | number | undefined,
        newValue: string | number | undefined,
        changes: string[]
    ): void {
        const normalizedOld = oldValue ?? '';
        const normalizedNew = newValue ?? '';

        if (normalizedOld !== normalizedNew) {
            changes.push(`${fieldName} (Old: '${normalizedOld}' → New: '${normalizedNew}')`);
        }
    }

    /**
     * Compares array fields and returns detailed change description
     */
    private compareArrayFields(
        fieldName: string,
        oldArray: TermsDto[] | CustomerProductDealDto[] | undefined,
        newArray: TermsDto[] | CustomerProductDealDto[] | undefined,
        idField: 'termsId' | 'productDealId'
    ): string | null {
        const oldArr = oldArray || [];
        const newArr = newArray || [];

        // Create maps for easier lookup
        const oldMap = new Map<string, TermsDto | CustomerProductDealDto>();
        const newMap = new Map<string, TermsDto | CustomerProductDealDto>();

        oldArr.forEach((item) => {
            const id = item[idField];
            if (id) {
                oldMap.set(id, item);
            }
        });

        newArr.forEach((item) => {
            const id = item[idField];
            if (id) {
                newMap.set(id, item);
            }
        });

        // Find added items (in new but not in old)
        const added: string[] = [];
        newMap.forEach((item, id) => {
            if (!oldMap.has(id)) {
                added.push(id);
            }
        });

        // Find removed items (in old but not in new)
        const removed: string[] = [];
        oldMap.forEach((item, id) => {
            if (!newMap.has(id)) {
                removed.push(id);
            }
        });

        // Find modified items (in both but different)
        const modified: string[] = [];
        oldMap.forEach((oldItem, id) => {
            if (newMap.has(id)) {
                const newItem = newMap.get(id);
                // Compare by JSON stringify (deep comparison)
                if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
                    modified.push(id);
                }
            }
        });

        // Build change description
        const parts: string[] = [];
        if (added.length > 0) {
            parts.push(`Added ${added.length} item${added.length > 1 ? 's' : ''}`);
        }
        if (removed.length > 0) {
            parts.push(`Removed ${removed.length} item${removed.length > 1 ? 's' : ''}`);
        }
        if (modified.length > 0) {
            parts.push(`Modified ${modified.length} item${modified.length > 1 ? 's' : ''}`);
        }

        if (parts.length > 0) {
            return `${fieldName}: ${parts.join(', ')}`;
        }

        return null;
    }

    /**
     * Formats the list of field changes as a readable string
     */
    private formatFieldChanges(changes: string[]): string {
        if (changes.length === 0) {
            return '';
        }

        // Map field names to human-readable labels
        const fieldLabels: Record<string, string> = {
            customerName: 'Customer Name',
            email: 'Email',
            address1: 'Address Line 1',
            address2: 'Address Line 2',
            balance: 'Balance',
            contactNo: 'Contact Number',
            contactPerson: 'Contact Person',
            townId: 'Town ID',
            townName: 'Town Name',
            creditLimit: 'Credit Limit',
            customerCredit: 'Customer Credit',
            tinNumber: 'TIN Number',
            areaId: 'Area ID',
            areaName: 'Area Name',
            customerClassificationId: 'Customer Classification ID',
            customerClassificationName: 'Customer Classification Name',
            customerTypeId: 'Customer Type ID',
            customerTypeName: 'Customer Type Name',
            customerTerms: 'Customer Terms',
            customerProductDeals: 'Customer Product Deals',
        };

        // Format each change with better readability
        const formattedChanges = changes.map((change) => {
            // Handle simple field changes: "fieldName (Old: 'value' → New: 'value')"
            // Updated regex to handle any characters in values, including empty strings
            if (change.includes('(Old:') && change.includes('→')) {
                const match = change.match(/^(\w+) \(Old: '(.*?)' → New: '(.*?)'\)$/);
                if (match) {
                    const [, fieldName, oldValue, newValue] = match;
                    const label = fieldLabels[fieldName] || fieldName;
                    const displayOld = oldValue === '' ? '(empty)' : oldValue;
                    const displayNew = newValue === '' ? '(empty)' : newValue;
                    return `• ${label}: "${displayOld}" → "${displayNew}"`;
                }
            }

            // Handle array changes: "fieldName: Added X items, Removed Y items, Modified Z items"
            if (change.includes(':')) {
                const colonIndex = change.indexOf(':');
                const fieldName = change.substring(0, colonIndex).trim();
                const rest = change.substring(colonIndex + 1).trim();
                const label = fieldLabels[fieldName] || fieldName;
                return `• ${label}: ${rest}`;
            }

            // Fallback for any other format
            return `• ${change}`;
        });

        return `\n\nModified Fields:\n${formattedChanges.join('\n')}`;
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
