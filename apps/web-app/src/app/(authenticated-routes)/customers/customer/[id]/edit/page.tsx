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
import CustomerForm from '../../components/CustomerForm';
import CustomerFinancialsTab from './components/CustomerFinancialsTab';

interface EditCustomerPageProps {
    params: {
        id: string;
    };
}

export default function EditCustomerPage({ params }: EditCustomerPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'logs' | 'financials'>('details');
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

                const customer = await (CustomerApi as any).getCustomerById(params.id, userRole);
                setSelectedCustomer(customer);

                // Always default to details tab (approval is now handled inline)
                setActiveTab('details');
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

            await (CustomerApi as any).deleteCustomer(customerWithReason, userRole);

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
            const approvedCustomer = await (CustomerApi as any).approveCustomer(selectedCustomer.customerId, userRole);
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

    // Render logs tab content
    const renderLogsTab = () => {
        if (!selectedCustomer) return null;

        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-gray-600 p-2 text-white shadow-sm">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <h3 className="m-0 text-base font-bold text-gray-700">Activity Logs</h3>
                    </div>

                    {renderActivityLogsTable(selectedCustomer?.activityLogs)}
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="hidden sm:block" />
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        {isAdminUser &&
                            selectedCustomer &&
                            [
                                StatusEnum.FOR_APPROVAL,
                                StatusEnum.NEW_RECORD,
                                StatusEnum.FOR_DELETION,
                                StatusEnum.FOR_DEACTIVATION,
                            ].includes(selectedCustomer.status as StatusEnum) && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleDeny}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                    >
                                        Deny
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleApprove}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                    >
                                        Approve
                                    </button>
                                </>
                            )}
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Cancel
                        </button>
                    </div>
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

                                <button
                                    onClick={() => setActiveTab('financials')}
                                    className={`flex-shrink-0 px-5 py-3 rounded-lg font-semibold text-sm transition-colors ${
                                        activeTab === 'financials'
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
                                                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                                            />
                                        </svg>
                                        Financials
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
                                    isLoading={isLoading}
                                    activeTab="details"
                                    onSave={handleSave}
                                    onDelete={handleDelete}
                                    onReactivate={handleReactivate}
                                    onCancel={handleCancel}
                                    onApprove={handleApprove}
                                    onDeny={handleDeny}
                                />
                            )}

                            {activeTab === 'logs' && renderLogsTab()}

                            {activeTab === 'financials' && <CustomerFinancialsTab customerId={params.id} />}
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
