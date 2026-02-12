'use client';

import { ContractDto, StatusEnum } from '@data-access/index';
import { useEffect } from 'react';
import ContractForm from './ContractForm';

interface ContractModalProps {
    show: boolean;
    isCreateMode: boolean;
    selectedContract: ContractDto | null;
    activeTab: 'details' | 'approval' | 'logs';
    successMessage: string | null;
    isAdminUser: boolean;
    isLoading: boolean;
    onClose: () => void;
    onTabChange: (tab: 'details' | 'approval' | 'logs') => void;
    onSave: (contract: ContractDto) => void;
    onDelete: () => void;
    onApprove: () => void;
    onDeny: () => void;
}

export default function ContractModal({
    show,
    isCreateMode,
    selectedContract,
    activeTab,
    successMessage,
    isAdminUser,
    isLoading,
    onClose,
    onTabChange,
    onSave,
    onDelete,
    onApprove,
    onDeny,
}: ContractModalProps) {
    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && show) {
                onClose();
            }
        };

        if (show) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [show, onClose]);

    if (!show) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '24px',
                    width: '600px',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '24px',
                    }}
                >
                    <h2
                        style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#1f2937',
                            margin: 0,
                        }}
                    >
                        {isCreateMode ? 'Create Contract' : 'Edit Contract'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: '#6b7280',
                            padding: '4px',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Tab Navigation */}
                <div
                    style={{
                        display: 'flex',
                        borderBottom: '2px solid #e5e7eb',
                        marginBottom: '20px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px 8px 0 0',
                        padding: '4px',
                    }}
                >
                    <button
                        onClick={() => onTabChange('details')}
                        style={{
                            padding: '12px 20px',
                            backgroundColor: activeTab === 'details' ? 'white' : 'transparent',
                            color: activeTab === 'details' ? '#1f2937' : '#6b7280',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: activeTab === 'details' ? '600' : '500',
                            transition: 'all 0.2s ease',
                            boxShadow: activeTab === 'details' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
                            marginRight: '4px',
                        }}
                        onMouseEnter={(e) => {
                            if (activeTab !== 'details') {
                                e.currentTarget.style.backgroundColor = '#f1f5f9';
                                e.currentTarget.style.color = '#374151';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== 'details') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#6b7280';
                            }
                        }}
                    >
                        Details
                    </button>

                    {!isCreateMode && selectedContract && selectedContract.status !== StatusEnum.ACTIVE && (
                        <button
                            onClick={() => onTabChange('approval')}
                            style={{
                                padding: '12px 20px',
                                backgroundColor: activeTab === 'approval' ? 'white' : 'transparent',
                                color: activeTab === 'approval' ? '#1f2937' : '#6b7280',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: activeTab === 'approval' ? '600' : '500',
                                transition: 'all 0.2s ease',
                                boxShadow: activeTab === 'approval' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
                                marginRight: '4px',
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== 'approval') {
                                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                                    e.currentTarget.style.color = '#374151';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'approval') {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#6b7280';
                                }
                            }}
                        >
                            Approval Version
                        </button>
                    )}

                    {!isCreateMode && (
                        <button
                            onClick={() => onTabChange('logs')}
                            style={{
                                padding: '12px 20px',
                                backgroundColor: activeTab === 'logs' ? 'white' : 'transparent',
                                color: activeTab === 'logs' ? '#1f2937' : '#6b7280',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: activeTab === 'logs' ? '600' : '500',
                                transition: 'all 0.2s ease',
                                boxShadow: activeTab === 'logs' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== 'logs') {
                                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                                    e.currentTarget.style.color = '#374151';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'logs') {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#6b7280';
                                }
                            }}
                        >
                            Activity Logs
                        </button>
                    )}
                </div>

                {/* Tab Content */}
                <div>
                    {/* Details Tab */}
                    {activeTab === 'details' && (
                        <ContractForm
                            isCreateMode={isCreateMode}
                            selectedContract={selectedContract}
                            successMessage={successMessage}
                            onSave={onSave}
                            onDelete={onDelete}
                            onCancel={onClose}
                            isAdminUser={isAdminUser}
                        />
                    )}

                    {/* Approval Version Tab */}
                    {activeTab === 'approval' && !isCreateMode && selectedContract && (
                        <div>
                            <div className="mb-5">
                                {/* Change Reason - Highlighted field */}
                                {selectedContract?.changeReason && (
                                    <div
                                        style={{
                                            backgroundColor: '#fef3c7',
                                            border: '2px solid #f59e0b',
                                            borderRadius: '8px',
                                            padding: '16px',
                                            marginBottom: '20px',
                                            boxShadow: '0 2px 4px 0 rgba(245, 158, 11, 0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginBottom: '12px',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    backgroundColor: '#f59e0b',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                }}
                                            >
                                                📝
                                            </div>
                                            <h4
                                                style={{
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    color: '#92400e',
                                                    margin: 0,
                                                }}
                                            >
                                                Change Reason
                                            </h4>
                                        </div>
                                        <div
                                            style={{
                                                padding: '12px 16px',
                                                backgroundColor: 'white',
                                                border: '1px solid #f59e0b',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                color: '#92400e',
                                                lineHeight: '1.5',
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        >
                                            {selectedContract.changeReason}
                                        </div>
                                    </div>
                                )}

                                {/* Contract Form for Approval Version */}
                                <ContractForm
                                    isCreateMode={false}
                                    selectedContract={selectedContract}
                                    successMessage={null}
                                    onSave={() => {}} // No save functionality in approval tab
                                    onDelete={() => {}} // No delete functionality in approval tab
                                    onCancel={() => {}} // No cancel functionality in approval tab
                                    isAdminUser={isAdminUser}
                                />
                            </div>

                            <div className="flex justify-between mt-6">
                                {/* Approve/Deny buttons for admin users when status is FOR_APPROVAL or NEW_RECORD */}
                                {isAdminUser &&
                                (selectedContract?.status === StatusEnum.FOR_APPROVAL ||
                                    selectedContract?.status === StatusEnum.NEW_RECORD ||
                                    selectedContract?.status === StatusEnum.FOR_DELETION) ? (
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            type="button"
                                            onClick={onDeny}
                                            disabled={isLoading}
                                            style={{
                                                padding: '10px 20px',
                                                backgroundColor: isLoading ? '#9ca3af' : '#dc2626',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                transition: 'all 0.2s ease',
                                                opacity: isLoading ? 0.7 : 1,
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isLoading) {
                                                    e.currentTarget.style.backgroundColor = '#b91c1c';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isLoading) {
                                                    e.currentTarget.style.backgroundColor = '#dc2626';
                                                }
                                            }}
                                        >
                                            {isLoading ? 'Processing...' : 'Deny Changes'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onApprove}
                                            disabled={isLoading}
                                            style={{
                                                padding: '10px 20px',
                                                backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                transition: 'all 0.2s ease',
                                                opacity: isLoading ? 0.7 : 1,
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isLoading) {
                                                    e.currentTarget.style.backgroundColor = '#2563eb';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isLoading) {
                                                    e.currentTarget.style.backgroundColor = '#3b82f6';
                                                }
                                            }}
                                        >
                                            {isLoading ? 'Processing...' : 'Approve Changes'}
                                        </button>
                                    </div>
                                ) : (
                                    <div></div>
                                )}

                                {/* Close button - always visible on the right */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Activity Logs Tab */}
                    {activeTab === 'logs' && !isCreateMode && (
                        <div>
                            <div className="mb-5">
                                <h3 className="text-base font-semibold text-gray-800 mb-3">Recent Activity</h3>
                                {selectedContract?.activityLogs && selectedContract.activityLogs.length > 0 ? (
                                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-72 overflow-y-auto">
                                        {selectedContract.activityLogs.map((log, index) => (
                                            <div
                                                key={index}
                                                className={`py-2 ${
                                                    index < selectedContract.activityLogs!.length - 1
                                                        ? 'border-b border-gray-200'
                                                        : ''
                                                }`}
                                            >
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">No activity logs available</p>
                                )}
                            </div>

                            <div className="flex justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
