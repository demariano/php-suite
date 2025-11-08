'use client';

import { ProductClassDto, StatusEnum } from '@data-access/index';

interface ClassFormProps {
  isCreateMode: boolean;
  selectedClass: ProductClassDto | null;
  successMessage: string | null;
  onSave: (productClass: ProductClassDto) => void;
  onDelete: () => void;
  onCancel: () => void;
  isAdminUser?: boolean;
  activeTab?: 'details' | 'approval' | 'logs';
  onTabChange?: (tab: 'details' | 'approval' | 'logs') => void;
  isLoading?: boolean;
  onApprove?: () => void;
  onDeny?: () => void;
}

export default function ClassForm({
  isCreateMode,
  selectedClass,
  successMessage,
  onSave,
  onDelete,
  onCancel,
  isAdminUser = false,
  activeTab = 'details',
  onTabChange = () => {},
  isLoading = false,
  onApprove = () => {},
  onDeny = () => {}
}: ClassFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const className = formData.get('productClassName') as string;
    
    if (isCreateMode) {
      const newClass = {
        productClassName: className,
        status: StatusEnum.NEW_RECORD // Default status for new classes
      };
      onSave(newClass as ProductClassDto);
    } else {
      const updatedClass = {
        ...selectedClass,
        productClassName: className,
        status: StatusEnum.ACTIVE
      };
      onSave(updatedClass as ProductClassDto);
    }
  };

  // Render form content
  const renderDetailsTab = () => (
    <form onSubmit={handleSubmit}>
      {/* Success message */}
      {successMessage && (
        <div style={{
          backgroundColor: '#dcfce7',
          border: '2px solid #16a34a',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#16a34a',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ✓
          </div>
          <span style={{
            color: '#166534',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {successMessage}
          </span>
        </div>
      )}
      
      {/* Pending approval or deletion warning */}
      {!isCreateMode && selectedClass && 
       (selectedClass.status === StatusEnum.FOR_APPROVAL || selectedClass.status === StatusEnum.NEW_RECORD || selectedClass.status === StatusEnum.FOR_DELETION) && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#f59e0b',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ⚠
          </div>
          <span style={{
            color: '#92400e',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {selectedClass.status === StatusEnum.FOR_DELETION 
              ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
              : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
          </span>
        </div>
      )}
      
      {/* Record Fields Container */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            backgroundColor: '#3b82f6',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            📋
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            Record Details
          </h3>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Class Name
          </label>
          <input
            type="text"
            name="productClassName"
            defaultValue={isCreateMode ? '' : selectedClass?.productClassName || ''}
            placeholder={isCreateMode ? 'Enter class name' : ''}
            disabled={!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
              color: (!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: (!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'text'
            }}
            onFocus={(e) => {
              if (isCreateMode || selectedClass?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
            required
          />
        </div>
        
        {!isCreateMode && selectedClass && (
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Status
            </label>
            <div style={{
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#f9fafb',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              {selectedClass.status || 'ACTIVE'}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-6">
        {!isCreateMode && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            disabled={selectedClass?.status !== StatusEnum.ACTIVE}
            style={{
              padding: '10px 20px',
              backgroundColor: selectedClass?.status !== StatusEnum.ACTIVE ? 'transparent' : '#dc2626',
              color: selectedClass?.status !== StatusEnum.ACTIVE ? '#9ca3af' : 'white',
              border: selectedClass?.status !== StatusEnum.ACTIVE ? '1px solid #d1d5db' : 'none',
              borderRadius: '6px',
              cursor: selectedClass?.status !== StatusEnum.ACTIVE ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: selectedClass?.status !== StatusEnum.ACTIVE ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (selectedClass?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#b91c1c';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedClass?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }
            }}
          >
            Delete
          </button>
        )}
        
        <div className="flex gap-3 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE}
            style={{
              padding: '10px 20px',
              backgroundColor: (!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE) ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: (!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE) ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (isCreateMode || selectedClass?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (isCreateMode || selectedClass?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {isCreateMode ? 'Create Class' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );

  // Render approval tab
  const renderApprovalTab = () => {
    if (isCreateMode || !selectedClass) return null;
    
    return (
      <div>
        <div className="mb-5">
          {(selectedClass.status === StatusEnum.FOR_APPROVAL || selectedClass.status === StatusEnum.NEW_RECORD) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-center gap-2">
              <span className="text-yellow-600 text-base">ℹ️</span>
              <span className="text-yellow-800 text-sm">
                These are the proposed changes awaiting approval
              </span>
            </div>
          )}
          
          {selectedClass?.forApprovalVersion ? (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#f59e0b',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  ⏳
                </div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: 0
                }}>
                  Pending Approval Details
                </h3>
              </div>

              {/* Product Class Name */}
              {selectedClass.forApprovalVersion.productClassName !== undefined && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Class Name
                  </label>
                  <input
                    type="text"
                    value={String(selectedClass.forApprovalVersion.productClassName)}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#f9fafb',
                      color: '#6b7280',
                      fontWeight: '500'
                    }}
                  />
                </div>
              )}
              
              {/* Status */}
              {selectedClass.forApprovalVersion.status !== undefined && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Status
                  </label>
                  <input
                    type="text"
                    value={String(selectedClass.forApprovalVersion.status)}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#f9fafb',
                      color: '#6b7280',
                      fontWeight: '500'
                    }}
                  />
                </div>
              )}
              
              {/* Other fields that might be in forApprovalVersion */}
              {Object.entries(selectedClass.forApprovalVersion).map(([key, value]) => {
                // Skip the fields we've already handled
                if (key === 'productClassName' || key === 'status') {
                  return null;
                }
                
                return (
                  <div key={key} style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      {/* Convert camelCase to Title Case */}
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </label>
                    <input
                      type="text"
                      value={String(value)}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#f9fafb',
                        color: '#6b7280',
                        fontWeight: '500'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 italic">
              No pending approval changes
            </p>
          )}
        </div>
        
        <div className="flex justify-between mt-6">
          {/* Approve/Deny buttons for admin users when status is FOR_APPROVAL or NEW_RECORD */}
          {isAdminUser && (selectedClass?.status === StatusEnum.FOR_APPROVAL || selectedClass?.status === StatusEnum.NEW_RECORD || selectedClass?.status === StatusEnum.FOR_DELETION) && (
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
                  opacity: isLoading ? 0.7 : 1
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
                  opacity: isLoading ? 0.7 : 1
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
          )}
          
          {/* Cancel button - always visible on the right */}
          <div>
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render logs tab
  const renderLogsTab = () => {
    if (isCreateMode || !selectedClass) return null;
    
    return (
      <div>
        <div className="mb-5">
          <h3 className="text-base font-semibold text-gray-800 mb-3">
            Recent Activity
          </h3>
          {selectedClass?.activityLogs && selectedClass.activityLogs.length > 0 ? (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-72 overflow-y-auto">
              {selectedClass.activityLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`py-2 ${
                    index < selectedClass.activityLogs!.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">
              No activity logs available
            </p>
          )}
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Tab Navigation - Only show in edit mode */}
      {!isCreateMode && (
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #e5e7eb',
          marginBottom: '20px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px 8px 0 0',
          padding: '4px'
        }}>
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
              marginRight: '4px'
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
          
          {selectedClass && selectedClass.status !== StatusEnum.ACTIVE && (
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
                marginRight: '4px'
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
                boxShadow: activeTab === 'logs' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
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
      )}

      {/* Tab Content */}
      {activeTab === 'details' && renderDetailsTab()}
      {activeTab === 'approval' && !isCreateMode && renderApprovalTab()}
      {activeTab === 'logs' && !isCreateMode && renderLogsTab()}
    </>
  );
}

