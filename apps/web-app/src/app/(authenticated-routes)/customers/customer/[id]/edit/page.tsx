'use client';

import { ConfirmationModal, DeleteConfirmationModal, DenyReasonDialog } from '@components-web';
import {
    CustomerApi,
    CustomerDto,
    extractErrorMessage,
    StatusEnum,
    useEnv,
    useLocalStore,
    useSessionStore,
} from '@data-access/index';
import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createFieldChangeDetector } from '../../../../utils/fieldChangeDetection';
import CustomerForm from '../../components/CustomerForm';

interface EditCustomerPageProps {
    params: {
        id: string;
    };
}

export default function EditCustomerPage({ params }: EditCustomerPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'approval' | 'logs'>('details');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDenyDialog, setShowDenyDialog] = useState(false);
    const [showReactivateModal, setShowReactivateModal] = useState(false);
    const { env } = useEnv();
    const { authedUser } = useLocalStore();
    const { setFlashNotification } = useSessionStore();
    const router = useRouter();

    // Check if user is admin or super admin
    const isAdminUser = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';

    // Fetch customer details on component mount
    useEffect(() => {
        const fetchCustomer = async () => {
            try {
                setIsLoading(true);

                // SECURITY: Only get user role if BYPASS_AUTH is enabled
                // This prevents role parameter leakage when bypass auth is disabled
                const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

                const customer = await CustomerApi.getCustomerById(params.id, userRole);
                setSelectedCustomer(customer);

                // If the record is in FOR_APPROVAL, NEW_RECORD, or FOR_DEACTIVATION status and user is admin, open the approval tab
                // Note: FOR_DELETION is NOT used for Master Data (Customer is Master Data - uses FOR_DEACTIVATION)
                if (
                    (customer.status === StatusEnum.FOR_APPROVAL ||
                        customer.status === StatusEnum.NEW_RECORD ||
                        customer.status === StatusEnum.FOR_DEACTIVATION) &&
                    isAdminUser
                ) {
                    setActiveTab('approval');
                } else {
                    // Default to details tab
                    setActiveTab('details');
                }
            } catch (err) {
                console.error('Error fetching customer:', err);
                const errorMessage = extractErrorMessage(err, 'Failed to load customer details. Please try again.');
                setFlashNotification({
                    title: 'Error',
                    message: errorMessage,
                    alertType: 'error',
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (params.id) {
            fetchCustomer();
        }
    }, [params.id, env.BYPASS_AUTH, authedUser?.userRole, isAdminUser]);

    const handleSave = async (customer: CustomerDto) => {
        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Update existing customer
            const updatedCustomer = await CustomerApi.updateCustomer(
                params.id,
                {
                    customerId: customer.customerId,
                    customerName: customer.customerName,
                    email: customer.email,
                    address1: customer.address1,
                    address2: customer.address2,
                    balance: customer.balance,
                    contactNo: customer.contactNo,
                    contactPerson: customer.contactPerson,
                    townId: customer.townId,
                    townName: customer.townName,
                    creditLimit: customer.creditLimit,
                    customerCredit: customer.customerCredit,
                    tinNumber: customer.tinNumber,
                    areaId: customer.areaId,
                    areaName: customer.areaName,
                    customerClassificationId: customer.customerClassificationId,
                    customerClassificationName: customer.customerClassificationName,
                    customerTypeId: customer.customerTypeId,
                    customerTypeName: customer.customerTypeName,
                    status: customer.status,
                    changeReason: customer.changeReason,
                    customerTerms: customer.customerTerms,
                    customerProductDeals: customer.customerProductDeals,
                },
                userRole
            );

            setSelectedCustomer(updatedCustomer);
            setFlashNotification({
                title: 'Success!',
                message: 'Customer updated successfully!',
                alertType: 'success',
            });

            // Navigate back to customer list after a short delay
            setTimeout(() => {
                router.push('/customers/customer');
            }, 1500);
        } catch (error) {
            console.error('Error updating customer:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to update customer. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = () => {
        if (!selectedCustomer) {
            return;
        }
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async (deletionReason: string) => {
        if (!selectedCustomer) {
            return;
        }

        setShowDeleteModal(false);

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // MASTER DATA SOFT DELETE PATTERN:
            // - Call DELETE API which will set status based on role:
            //   * ADMIN/SUPER_ADMIN → INACTIVE (immediate soft delete)
            //   * USER → FOR_DEACTIVATION (requires approval)
            const customerWithReason = {
                ...selectedCustomer,
                changeReason: deletionReason,
            };

            await CustomerApi.deleteCustomer(customerWithReason, userRole);

            const isAdmin = authedUser?.userRole === 'ADMIN' || authedUser?.userRole === 'SUPER_ADMIN';
            setFlashNotification({
                title: 'Success!',
                message: isAdmin
                    ? 'Customer deactivated successfully!'
                    : 'Customer deactivation request submitted for approval!',
                alertType: 'success',
            });

            // Navigate back to customer list immediately - notification will persist
            router.push('/customers/customer');
        } catch (error) {
            console.error('Error deleting customer:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to delete customer. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReactivate = () => {
        if (!selectedCustomer) {
            return;
        }
        setShowReactivateModal(true);
    };

    const handleReactivateConfirm = async () => {
        if (!selectedCustomer) {
            return;
        }

        setShowReactivateModal(false);

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled AND in development mode
            // This prevents role parameter leakage in production
            const userRole =
                env.BYPASS_AUTH === 'ENABLED' && process.env.NODE_ENV === 'development'
                    ? authedUser?.userRole
                    : undefined;

            // Reactivate by updating status from INACTIVE to ACTIVE
            const reactivatedCustomer = await CustomerApi.updateCustomer(
                params.id,
                {
                    ...selectedCustomer,
                    status: StatusEnum.ACTIVE,
                },
                userRole
            );

            setSelectedCustomer(reactivatedCustomer);
            setFlashNotification({
                title: 'Success!',
                message: 'Customer reactivated successfully!',
                alertType: 'success',
            });

            // Navigate back to customer list immediately - notification will persist
            router.push('/customers/customer');
        } catch (error) {
            console.error('Error reactivating customer:', error);
            const errorMessage = extractErrorMessage(error, 'Failed to reactivate customer. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedCustomer) return;

        try {
            setIsLoading(true);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to approve the record
            const approvedCustomer = await CustomerApi.approveCustomer(selectedCustomer.customerId, userRole);
            setSelectedCustomer(approvedCustomer);
            setFlashNotification({
                title: 'Success!',
                message: 'Customer approved successfully!',
                alertType: 'success',
            });

            // Navigate back to customer list immediately - notification will persist
            router.push('/customers/customer');
        } catch (err) {
            console.error('Error approving customer:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to approve customer. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeny = () => {
        setShowDenyDialog(true);
    };

    const handleDenyConfirm = async (approverMessage: string) => {
        if (!selectedCustomer) return;

        try {
            setIsLoading(true);
            setShowDenyDialog(false);

            // SECURITY: Only get user role if BYPASS_AUTH is enabled
            // This prevents role parameter leakage when bypass auth is disabled
            const userRole = env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : undefined;

            // Call the API to deny the record with approverMessage
            const deniedCustomer = await CustomerApi.denyCustomer(
                selectedCustomer.customerId,
                approverMessage,
                userRole
            );
            setSelectedCustomer(deniedCustomer);
            setFlashNotification({
                title: 'Success!',
                message: 'Customer changes denied successfully!',
                alertType: 'success',
            });

            // Navigate back to customer list immediately - notification will persist
            router.push('/customers/customer');
        } catch (err) {
            console.error('Error denying customer:', err);
            const errorMessage = extractErrorMessage(err, 'Failed to deny customer. Please try again.');
            setFlashNotification({
                title: 'Error',
                message: errorMessage,
                alertType: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDenyCancel = () => {
        setShowDenyDialog(false);
    };

    const handleCancel = () => {
        router.push('/customers/customer');
    };

    // Helper function to get status text
    const getStatusText = (status: StatusEnum): string => {
        switch (status) {
            case StatusEnum.ACTIVE:
                return 'Active';
            case StatusEnum.FOR_APPROVAL:
                return 'For Approval';
            case StatusEnum.FOR_DELETION:
                return 'For Deletion';
            case StatusEnum.NEW_RECORD:
                return 'New Record';
            default:
                return status;
        }
    };

    // Helper function to get tab color based on status
    const getTabColorClasses = (status: StatusEnum, isActive: boolean): string => {
        if (!isActive) {
            return 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900';
        }

        switch (status) {
            case StatusEnum.ACTIVE:
                return 'bg-green-600 text-white shadow-sm';
            case StatusEnum.FOR_APPROVAL:
                return 'bg-yellow-500 text-white shadow-sm';
            case StatusEnum.FOR_DELETION:
            case StatusEnum.FOR_DEACTIVATION:
                return 'bg-red-600 text-white shadow-sm';
            case StatusEnum.NEW_RECORD:
                return 'bg-blue-600 text-white shadow-sm';
            default:
                return 'bg-gray-500 text-white shadow-sm';
        }
    };

    if (!selectedCustomer && !isLoading) {
        return (
            <div className="min-h-screen bg-white p-4 sm:p-6">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center shadow-sm">
                    <span>Customer not found</span>
                </div>
            </div>
        );
    }

    // Render approval tab content (similar to CustomerModal)
    const renderApprovalTab = () => {
        if (!selectedCustomer) return null;

        // MASTER DATA: If status is FOR_DEACTIVATION, show deactivation message instead of approval version
        // Note: FOR_DELETION is NOT used for Master Data (Customer uses FOR_DEACTIVATION for soft delete)
        if (selectedCustomer.status === StatusEnum.FOR_DEACTIVATION) {
            return (
                <div className="space-y-6 animate-fadeIn">
                    <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-6 shadow-sm sm:p-8">
                        <div className="mb-4 flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-600">
                                <svg
                                    className="h-6 w-6 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-orange-800">Record Marked for Deactivation</h3>
                                <p className="mt-1 text-sm text-orange-700">
                                    This record has been marked for deactivation (soft delete) and is awaiting approval.
                                </p>
                            </div>
                        </div>
                        {selectedCustomer.changeReason && (
                            <div className="mt-6 rounded-lg border-2 border-orange-200 bg-white p-4">
                                <p className="text-sm font-semibold text-gray-700">Deactivation Reason:</p>
                                <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed">
                                    {selectedCustomer.changeReason}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        {isAdminUser ? (
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                <button
                                    type="button"
                                    onClick={handleDeny}
                                    disabled={isLoading}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                    {isLoading ? 'Processing...' : 'Deny Deactivation'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApprove}
                                    disabled={isLoading}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    {isLoading ? 'Processing...' : 'Approve Deactivation'}
                                </button>
                            </div>
                        ) : (
                            <div className="hidden sm:block" />
                        )}

                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                            Cancel
                        </button>
                    </div>
                </div>
            );
        }

        // For FOR_APPROVAL and NEW_RECORD, show approval version
        if (!selectedCustomer.forApprovalVersion) return null;

        const approvalData = selectedCustomer.forApprovalVersion;

        // Use shared field change detection utility
        const isFieldChanged = createFieldChangeDetector(
            selectedCustomer as Record<string, unknown>,
            selectedCustomer.forApprovalVersion as Record<string, unknown> | undefined
        );

        // Helper function to check if arrays have changes
        const hasArrayChanges = (fieldName: string): boolean => {
            if (!selectedCustomer?.forApprovalVersion) return false;
            const originalValue = (selectedCustomer as any)[fieldName];
            const newValue = (selectedCustomer.forApprovalVersion as any)[fieldName];

            if (!originalValue && !newValue) return false;
            if (!originalValue || !newValue) return true;
            if (!Array.isArray(originalValue) || !Array.isArray(newValue)) return false;

            // Normalize arrays for comparison (exclude metadata fields)
            const normalizeArray = (arr: any[], idField: string) => {
                return arr
                    .map((item) => {
                        const normalized: any = {};
                        Object.keys(item).forEach((key) => {
                            if (key !== 'activityLogs' && key !== 'forApprovalVersion') {
                                normalized[key] = item[key];
                            }
                        });
                        return normalized;
                    })
                    .sort((a, b) => (a[idField] || '').localeCompare(b[idField] || ''));
            };

            if (fieldName === 'customerTerms') {
                const normalizedOriginal = normalizeArray(originalValue, 'termsId');
                const normalizedNew = normalizeArray(newValue, 'termsId');
                return JSON.stringify(normalizedOriginal) !== JSON.stringify(normalizedNew);
            } else if (fieldName === 'customerProductDeals') {
                const normalizedOriginal = normalizeArray(originalValue, 'productDealId');
                const normalizedNew = normalizeArray(newValue, 'productDealId');
                return JSON.stringify(normalizedOriginal) !== JSON.stringify(normalizedNew);
            }

            return JSON.stringify(originalValue) !== JSON.stringify(newValue);
        };

        // Helper function to format display value
        const formatValue = (value: any): string => {
            if (value === null || value === undefined) return '-';
            if (typeof value === 'boolean') return value ? 'Yes' : 'No';
            if (typeof value === 'number') return value.toString();
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value);
        };

        // Helper function to render read-only field with highlighting
        const renderReadOnlyField = (label: string, value: any, colorClass: string, fieldName?: string) => {
            const fieldChanged = fieldName ? isFieldChanged(fieldName) : false;

            return (
                <div className="group">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 ${colorClass} rounded-full`}></span>
                        {label}
                    </label>
                    <div
                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm cursor-not-allowed ${
                            fieldChanged
                                ? 'border-blue-500 bg-blue-50 text-gray-700'
                                : 'border-gray-200 bg-white text-gray-500'
                        }`}
                    >
                        {formatValue(value)}
                    </div>
                </div>
            );
        };

        return (
            <div className="space-y-6 animate-fadeIn rounded-xl border-2 border-blue-200 bg-white p-4 shadow-sm sm:p-6">
                {/* Change Reason and Modification Made */}
                {selectedCustomer?.changeReason && (
                    <div className="mb-6 rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                </svg>
                            </div>
                            <h4 className="m-0 text-base font-bold text-blue-600">
                                Change Reason and Modification Made
                            </h4>
                        </div>
                        <div className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-mono text-sm font-medium text-gray-600 shadow-sm">
                            {selectedCustomer.changeReason}
                        </div>
                    </div>
                )}

                {/* Basic Information Section */}
                <div className="space-y-4">
                    <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-blue-600">Basic Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {renderReadOnlyField(
                                'Customer Name',
                                approvalData.customerName,
                                'bg-blue-500',
                                'customerName'
                            )}
                            {renderReadOnlyField('Email', approvalData.email, 'bg-blue-500', 'email')}
                            {renderReadOnlyField('Contact Number', approvalData.contactNo, 'bg-blue-500', 'contactNo')}
                            {renderReadOnlyField(
                                'Contact Person',
                                approvalData.contactPerson,
                                'bg-blue-500',
                                'contactPerson'
                            )}
                        </div>
                    </div>
                </div>

                {/* Address Information Section */}
                <div className="space-y-4">
                    <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-blue-600">Address Information</h3>
                        </div>
                        <div className="space-y-4">
                            {renderReadOnlyField('Address 1', approvalData.address1, 'bg-blue-500', 'address1')}
                            {renderReadOnlyField('Address 2', approvalData.address2, 'bg-blue-500', 'address2')}
                            {renderReadOnlyField('TIN Number', approvalData.tinNumber, 'bg-blue-500', 'tinNumber')}
                        </div>
                    </div>
                </div>

                {/* Location & Classification Section */}
                <div className="space-y-4">
                    <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-blue-600">Location & Classification</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {renderReadOnlyField('Area', approvalData.areaName, 'bg-blue-500', 'areaName')}
                            {renderReadOnlyField('Town', approvalData.townName, 'bg-blue-500', 'townName')}
                            {renderReadOnlyField(
                                'Customer Classification',
                                approvalData.customerClassificationName,
                                'bg-blue-500',
                                'customerClassificationName'
                            )}
                            {renderReadOnlyField(
                                'Customer Type',
                                approvalData.customerTypeName,
                                'bg-blue-500',
                                'customerTypeName'
                            )}
                        </div>
                    </div>
                </div>

                {/* Financial Information Section */}
                <div className="space-y-4">
                    <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-cyan-600">Financial Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {renderReadOnlyField('Balance', approvalData.balance, 'bg-blue-500', 'balance')}
                            {renderReadOnlyField(
                                'Credit Limit',
                                approvalData.creditLimit,
                                'bg-blue-500',
                                'creditLimit'
                            )}
                            {renderReadOnlyField(
                                'Customer Credit',
                                approvalData.customerCredit,
                                'bg-blue-500',
                                'customerCredit'
                            )}
                        </div>
                    </div>
                </div>

                {/* Customer Terms */}
                {(() => {
                    const termsChanged = hasArrayChanges('customerTerms');
                    const originalTerms = selectedCustomer.customerTerms;
                    const newTerms = selectedCustomer.forApprovalVersion.customerTerms;
                    const originalHasItems = originalTerms && Array.isArray(originalTerms) && originalTerms.length > 0;
                    const newHasItems = newTerms && Array.isArray(newTerms) && newTerms.length > 0;
                    const allRemoved = originalHasItems && !newHasItems;

                    // Render if there are changes OR if new array has items
                    if (!termsChanged && !newHasItems) return null;

                    return (
                        <div className="mt-6">
                            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                        <svg
                                            className="w-5 h-5 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                    </div>
                                    <h4
                                        className={`text-base font-bold ${
                                            termsChanged
                                                ? 'px-3 py-1 rounded-lg border-2 border-blue-500 bg-blue-50 text-blue-700'
                                                : 'text-blue-600'
                                        }`}
                                    >
                                        Customer Terms
                                    </h4>
                                </div>
                                {allRemoved ? (
                                    <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-600 rounded-lg">
                                                <svg
                                                    className="w-5 h-5 text-white"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                    />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-amber-800">
                                                    All Customer Terms records have been removed
                                                </p>
                                                <p className="text-xs text-amber-700 mt-1">
                                                    {originalTerms.length} record{originalTerms.length !== 1 ? 's' : ''}{' '}
                                                    will be deleted upon approval
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                                        {!newHasItems ? (
                                            <div className="p-10 text-center text-gray-500 text-base">
                                                No customer terms in pending changes.
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse">
                                                    <thead className="bg-white border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                                Terms Name
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                                Days
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {(newTerms as any[]).map((term: any, index: number) => (
                                                            <tr
                                                                key={index}
                                                                className="transition-all duration-200 bg-white hover:bg-gray-50"
                                                            >
                                                                <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                                    {term.termsName || 'Unnamed Terms'}
                                                                </td>
                                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                                    {term.days || 0}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Product Deals */}
                {(() => {
                    const dealsChanged = hasArrayChanges('customerProductDeals');
                    const originalDeals = selectedCustomer.customerProductDeals;
                    const newDeals = selectedCustomer.forApprovalVersion.customerProductDeals;
                    const originalHasItems = originalDeals && Array.isArray(originalDeals) && originalDeals.length > 0;
                    const newHasItems = newDeals && Array.isArray(newDeals) && newDeals.length > 0;
                    const allRemoved = originalHasItems && !newHasItems;

                    // Render if there are changes OR if new array has items
                    if (!dealsChanged && !newHasItems) return null;

                    return (
                        <div className="mt-6">
                            <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                        <svg
                                            className="w-5 h-5 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M13 10V3L4 14h7v7l9-11h-7z"
                                            />
                                        </svg>
                                    </div>
                                    <h4
                                        className={`text-base font-bold ${
                                            dealsChanged
                                                ? 'px-3 py-1 rounded-lg border-2 border-blue-500 bg-blue-50 text-blue-700'
                                                : 'text-gray-700'
                                        }`}
                                    >
                                        Product Deals
                                    </h4>
                                </div>
                                {allRemoved ? (
                                    <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-600 rounded-lg">
                                                <svg
                                                    className="w-5 h-5 text-white"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                    />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-amber-800">
                                                    All Product Deals records have been removed
                                                </p>
                                                <p className="text-xs text-amber-700 mt-1">
                                                    {originalDeals.length} record{originalDeals.length !== 1 ? 's' : ''}{' '}
                                                    will be deleted upon approval
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                                        {!newHasItems ? (
                                            <div className="p-10 text-center text-gray-500 text-base">
                                                No customer deals in pending changes.
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse">
                                                    <thead className="bg-white border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                                Product Name
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                                Product Deal Name
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                                Minimum Quantity
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                                                                Additional Quantity
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {(newDeals as any[]).map((deal: any, index: number) => (
                                                            <tr
                                                                key={index}
                                                                className="transition-all duration-200 bg-white hover:bg-gray-50"
                                                            >
                                                                <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                                    {deal.productName || '-'}
                                                                </td>
                                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                                    {deal.productDealName || '-'}
                                                                </td>
                                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                                    {deal.minQty || 0}
                                                                </td>
                                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                                    {deal.additionalQty || 0}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    {isAdminUser &&
                    (selectedCustomer?.status === StatusEnum.FOR_APPROVAL ||
                        selectedCustomer?.status === StatusEnum.NEW_RECORD ||
                        selectedCustomer?.status === StatusEnum.FOR_DELETION) ? (
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                            <button
                                type="button"
                                onClick={handleDeny}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                                {isLoading ? 'Processing...' : 'Deny Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={handleApprove}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                {isLoading ? 'Processing...' : 'Approve Changes'}
                            </button>
                        </div>
                    ) : (
                        <div className="hidden sm:block" />
                    )}

                    <button
                        type="button"
                        onClick={handleCancel}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                        Cancel
                    </button>
                </div>
            </div>
        );
    };

    // Render logs tab content
    const renderLogsTab = () => {
        if (!selectedCustomer) return null;

        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <h3 className="m-0 text-base font-bold text-blue-600">Activity Logs</h3>
                    </div>

                    {renderActivityLogsTable(selectedCustomer?.activityLogs)}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Breadcrumbs */}
            <div>
                <nav className="flex items-center gap-2">
                    <a
                        href="/dashboard"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Home
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/customers"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Customers
                    </a>
                    <span className="text-gray-400">/</span>
                    <a
                        href="/customers/customer"
                        className="text-blue-500 no-underline text-sm hover:text-blue-600 transition-colors duration-200"
                    >
                        Customer
                    </a>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-800 text-sm font-medium">Edit</span>
                </nav>
            </div>

            {/* Loading State */}
            {isLoading && !selectedCustomer && (
                <div className="flex justify-center items-center min-h-96">
                    <div className="text-gray-600">Loading customer details...</div>
                </div>
            )}

            {/* Customer Form with Tabs */}
            {selectedCustomer && (
                <div className="flex justify-center">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl w-full sm:max-w-4xl">
                        {/* Tab Navigation */}
                        <div className="bg-gray-50 border-b-2 border-blue-200 rounded-t-xl p-2 overflow-x-auto">
                            <div className="flex gap-2 flex-nowrap">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${getTabColorClasses(
                                        selectedCustomer.status || StatusEnum.ACTIVE,
                                        activeTab === 'details'
                                    )}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                        Customer Information
                                        {selectedCustomer && (
                                            <>
                                                <span className="mx-1">-</span>
                                                <span>
                                                    {getStatusText(selectedCustomer.status || StatusEnum.ACTIVE)}
                                                </span>
                                            </>
                                        )}
                                    </span>
                                </button>

                                {selectedCustomer.status !== StatusEnum.ACTIVE && (
                                    <button
                                        onClick={() => setActiveTab('approval')}
                                        className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                                            activeTab === 'approval'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            Pending Changes
                                        </span>
                                    </button>
                                )}

                                <button
                                    onClick={() => setActiveTab('logs')}
                                    className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                                        activeTab === 'logs'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        Activity Logs
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="bg-white p-4 sm:p-6">
                            {activeTab === 'details' && (
                                <CustomerForm
                                    isCreateMode={false}
                                    selectedCustomer={selectedCustomer}
                                    successMessage={null}
                                    isAdminUser={isAdminUser}
                                    activeTab="details"
                                    onSave={handleSave}
                                    onDelete={handleDelete}
                                    onReactivate={handleReactivate}
                                    onCancel={handleCancel}
                                />
                            )}

                            {activeTab === 'approval' && renderApprovalTab()}

                            {activeTab === 'logs' && renderLogsTab()}
                        </div>
                    </div>
                </div>
            )}

            <DenyReasonDialog
                show={showDenyDialog}
                record={selectedCustomer}
                recordDisplayName={selectedCustomer?.customerName}
                onConfirm={handleDenyConfirm}
                onCancel={handleDenyCancel}
            />

            <DeleteConfirmationModal
                show={showDeleteModal}
                record={selectedCustomer}
                recordDisplayName={selectedCustomer?.customerName}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setShowDeleteModal(false)}
            />

            <ConfirmationModal
                show={showReactivateModal}
                record={selectedCustomer}
                variant="reactivate"
                recordDisplayName={selectedCustomer?.customerName}
                customMessage="This will change the status from INACTIVE to ACTIVE."
                onConfirm={handleReactivateConfirm}
                onCancel={() => setShowReactivateModal(false)}
            />
        </div>
    );
}
