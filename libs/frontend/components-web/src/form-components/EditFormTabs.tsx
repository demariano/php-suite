/**
 * EditFormTabs Component
 *
 * Tab navigation for edit forms with Details, Pending Changes, and Activity Logs tabs.
 * Automatically shows/hides tabs based on form mode and record status.
 *
 * @example
 * <EditFormTabs
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 *   status={product.status}
 *   isCreateMode={false}
 *   showApprovalTab={hasForApprovalVersion}
 * />
 */

import React from 'react';

type StatusEnum = 'ACTIVE' | 'INACTIVE' | 'FOR_APPROVAL' | 'FOR_DELETION' | 'FOR_DEACTIVATION' | 'NEW_RECORD' | 'DRAFT';

export type EditFormTab = 'details' | 'approval' | 'logs';

export interface EditFormTabsProps {
    /** Currently active tab */
    activeTab: EditFormTab;
    /** Handler for tab change */
    onTabChange: (tab: EditFormTab) => void;
    /** Current status of the record */
    status?: StatusEnum;
    /** Whether this is create mode (hides non-details tabs) */
    isCreateMode?: boolean;
    /** Whether to show the approval/pending changes tab */
    showApprovalTab?: boolean;
    /** Whether to show the activity logs tab */
    showLogsTab?: boolean;
    /** Custom label for details tab */
    detailsLabel?: string;
    /** Custom label for approval tab */
    approvalLabel?: string;
    /** Custom label for logs tab */
    logsLabel?: string;
    /** Additional className for container */
    className?: string;
}

const STATUS_TAB_CLASSES: Record<StatusEnum, string> = {
    ACTIVE: 'bg-green-600 text-white shadow-sm',
    FOR_APPROVAL: 'bg-yellow-500 text-white shadow-sm',
    FOR_DELETION: 'bg-red-600 text-white shadow-sm',
    FOR_DEACTIVATION: 'bg-orange-600 text-white shadow-sm',
    NEW_RECORD: 'bg-blue-600 text-white shadow-sm',
    INACTIVE: 'bg-gray-500 text-white shadow-sm',
    DRAFT: 'bg-purple-600 text-white shadow-sm',
};

export const EditFormTabs: React.FC<EditFormTabsProps> = ({
    activeTab,
    onTabChange,
    status = 'ACTIVE',
    isCreateMode = false,
    showApprovalTab = false,
    showLogsTab = true,
    detailsLabel = 'Details',
    approvalLabel = 'Pending Changes',
    logsLabel = 'Activity Logs',
    className = '',
}) => {
    // In create mode, only show details tab
    if (isCreateMode) {
        return null;
    }

    const getTabClassName = (tab: EditFormTab, isActive: boolean): string => {
        if (!isActive) {
            return 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900';
        }

        return STATUS_TAB_CLASSES[status] ?? STATUS_TAB_CLASSES.NEW_RECORD;
    };

    return (
        <div className={`flex gap-2 border-b-2 border-gray-200 px-4 pb-0 pt-4 sm:px-6 ${className}`}>
            {/* Details Tab */}
            <button
                type="button"
                onClick={() => onTabChange('details')}
                className={`flex items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${getTabClassName(
                    'details',
                    activeTab === 'details'
                )}`}
            >
                <DocumentIcon />
                {detailsLabel}
            </button>

            {/* Approval/Pending Changes Tab */}
            {showApprovalTab && (
                <button
                    type="button"
                    onClick={() => onTabChange('approval')}
                    className={`flex items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${getTabClassName(
                        'approval',
                        activeTab === 'approval'
                    )}`}
                >
                    <ClockIcon />
                    {approvalLabel}
                </button>
            )}

            {/* Activity Logs Tab */}
            {showLogsTab && (
                <button
                    type="button"
                    onClick={() => onTabChange('logs')}
                    className={`flex items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${getTabClassName(
                        'logs',
                        activeTab === 'logs'
                    )}`}
                >
                    <ClockIcon />
                    {logsLabel}
                </button>
            )}
        </div>
    );
};

// Icons
const DocumentIcon: React.FC = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
    </svg>
);

const ClockIcon: React.FC = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

export default EditFormTabs;
