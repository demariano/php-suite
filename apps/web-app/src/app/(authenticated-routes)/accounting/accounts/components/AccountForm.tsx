'use client';

import { AccountsDto, AccountTypeEnum, StatusEnum } from '@data-access/index';
import { useEffect, useState } from 'react';

interface AccountFormProps {
  isCreateMode: boolean;
  selectedAccount: AccountsDto | null;
  successMessage: string | null;
  onSave: (account: AccountsDto) => void;
  onDelete: () => void;
  onCancel: () => void;
  isAdminUser?: boolean;
}

export default function AccountForm({
  isCreateMode,
  selectedAccount,
  successMessage,
  onSave,
  onDelete,
  onCancel,
  isAdminUser = false
}: AccountFormProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [newSubAccountName, setNewSubAccountName] = useState('');
  const [subAccountError, setSubAccountError] = useState<string | null>(null);
  
  // Form state for controlled inputs
  const [formData, setFormData] = useState({
    accountName: '',
    accountType: '' as AccountTypeEnum | '',
    changeReason: '',
    subAccounts: [] as string[]
  });

  // Set initial values when editing (only when account changes)
  useEffect(() => {
    if (!isCreateMode && selectedAccount) {
      setFormData({
        accountName: selectedAccount.accountName || '',
        accountType: selectedAccount.accountType || '',
        changeReason: selectedAccount.changeReason || '',
        subAccounts: selectedAccount.subAccounts || []
      });
    } else if (isCreateMode) {
      setFormData({
        accountName: '',
        accountType: '',
        changeReason: '',
        subAccounts: []
      });
    }
    setNewSubAccountName('');
    setSubAccountError(null);
  }, [isCreateMode, selectedAccount]);

  const handleAddSubAccount = () => {
    const trimmedName = newSubAccountName.trim();
    
    if (!trimmedName) {
      setSubAccountError('Sub-account name cannot be empty.');
      return;
    }

    // Check for duplicates (case-insensitive)
    const isDuplicate = formData.subAccounts.some(
      (name) => name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      setSubAccountError(`Sub-account "${trimmedName}" already exists.`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      subAccounts: [...prev.subAccounts, trimmedName]
    }));
    setNewSubAccountName('');
    setSubAccountError(null);
  };

  const handleDeleteSubAccount = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subAccounts: prev.subAccounts.filter((_, i) => i !== index)
    }));
    setSubAccountError(null);
  };

  const isSubAccountDisabled = !isCreateMode && selectedAccount?.status !== StatusEnum.ACTIVE;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate required fields
    const errors: string[] = [];
    
    if (!formData.accountName || formData.accountName.trim() === '') {
      errors.push('Account name is required.');
    }
    
    if (!formData.accountType) {
      errors.push('Account type is required.');
    }
    
    // Change reason is required for USER role (non-admin) when updating
    if (!isCreateMode && !isAdminUser && (!formData.changeReason || formData.changeReason.trim() === '')) {
      errors.push('Change reason is required when updating an account.');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Clear validation errors if validation passes
    setValidationErrors([]);
    
    if (isCreateMode) {
      const newAccount = {
        accountName: formData.accountName.trim(),
        accountType: formData.accountType,
        changeReason: formData.changeReason.trim() || undefined,
        subAccounts: formData.subAccounts,
        status: StatusEnum.ACTIVE // Default status for new accounts
      };
      onSave(newAccount as AccountsDto);
    } else {
      const updatedAccount = {
        ...selectedAccount,
        accountName: formData.accountName.trim(),
        accountType: formData.accountType,
        changeReason: isAdminUser ? (formData.changeReason.trim() || undefined) : formData.changeReason.trim(),
        subAccounts: formData.subAccounts
      };
      onSave(updatedAccount as AccountsDto);
    }
  };

  return (
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

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span style={{ color: '#dc2626', fontWeight: '600' }}>
              Please fix the following errors:
            </span>
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            color: '#dc2626'
          }}>
            {validationErrors.map((error, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Pending approval or deletion warning */}
      {!isCreateMode && selectedAccount && 
       (selectedAccount.status === StatusEnum.FOR_APPROVAL || selectedAccount.status === StatusEnum.NEW_RECORD || selectedAccount.status === StatusEnum.FOR_DELETION) && (
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
            {selectedAccount.status === StatusEnum.FOR_DELETION 
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
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06)'
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
            Account Name *
          </label>
          <input
            type="text"
            name="accountName"
            value={formData.accountName}
            onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
            placeholder={isCreateMode ? 'Enter account name' : ''}
            disabled={!isCreateMode && selectedAccount?.status !== StatusEnum.ACTIVE}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode && selectedAccount?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
              color: (!isCreateMode && selectedAccount?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: (!isCreateMode && selectedAccount?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'text'
            }}
            onFocus={(e) => {
              if (isCreateMode || selectedAccount?.status === StatusEnum.ACTIVE) {
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

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Account Type *
          </label>
          <select
            name="accountType"
            value={formData.accountType}
            onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value as AccountTypeEnum }))}
            disabled={!isCreateMode && selectedAccount?.status !== StatusEnum.ACTIVE}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode && selectedAccount?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
              color: (!isCreateMode && selectedAccount?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
              cursor: (!isCreateMode && selectedAccount?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'pointer'
            }}
            onFocus={(e) => {
              if (isCreateMode || selectedAccount?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
            required
          >
            <option value="">Select account type</option>
            <option value={AccountTypeEnum.AREA}>AREA</option>
            <option value={AccountTypeEnum.CUSTOMER}>CUSTOMER</option>
            <option value={AccountTypeEnum.OTHERS}>OTHERS</option>
          </select>
        </div>

        {/* Change Reason Field - Only show for non-create mode and non-admin users */}
        {!isCreateMode && !isAdminUser && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Change Reason *
            </label>
            <textarea
              name="changeReason"
              value={formData.changeReason}
              onChange={(e) => setFormData(prev => ({ ...prev, changeReason: e.target.value }))}
              placeholder="Please explain the reason for this change..."
              disabled={selectedAccount?.status !== StatusEnum.ACTIVE}
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: selectedAccount?.status !== StatusEnum.ACTIVE ? '#f9fafb' : 'white',
                color: selectedAccount?.status !== StatusEnum.ACTIVE ? '#6b7280' : 'inherit',
                transition: 'all 0.2s ease',
                cursor: selectedAccount?.status !== StatusEnum.ACTIVE ? 'not-allowed' : 'text',
                resize: 'vertical',
                minHeight: '80px',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                if (selectedAccount?.status === StatusEnum.ACTIVE) {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
              required={!isAdminUser}
            />
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              This field is required when making changes to the account record.
            </div>
          </div>
        )}
        
        {!isCreateMode && selectedAccount && (
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
            <div style={{
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#f9fafb',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              {selectedAccount.status || 'ACTIVE'}
            </div>
          </div>
        )}

        {/* Sub Accounts Section */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Sub Accounts
          </label>

          {/* Sub Account Error Message */}
          {subAccountError && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '2px solid #fecaca',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <span style={{
                color: '#dc2626',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {subAccountError}
              </span>
              <button
                onClick={() => setSubAccountError(null)}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#dc2626'
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Add Sub-Account Section */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start'
            }}>
              <input
                type="text"
                value={newSubAccountName}
                onChange={(e) => {
                  setNewSubAccountName(e.target.value);
                  setSubAccountError(null);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubAccount();
                  }
                }}
                placeholder="Enter sub-account name"
                disabled={isSubAccountDisabled}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: isSubAccountDisabled ? '#f9fafb' : 'white',
                  color: isSubAccountDisabled ? '#6b7280' : 'inherit',
                  cursor: isSubAccountDisabled ? 'not-allowed' : 'text'
                }}
                onFocus={(e) => {
                  if (!isSubAccountDisabled) {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={handleAddSubAccount}
                disabled={isSubAccountDisabled || !newSubAccountName.trim()}
                style={{
                  padding: '10px 16px',
                  backgroundColor: (isSubAccountDisabled || !newSubAccountName.trim()) ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (isSubAccountDisabled || !newSubAccountName.trim()) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  opacity: (isSubAccountDisabled || !newSubAccountName.trim()) ? 0.6 : 1,
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!isSubAccountDisabled && newSubAccountName.trim()) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubAccountDisabled && newSubAccountName.trim()) {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Sub-Accounts Table */}
          {formData.subAccounts.length === 0 ? (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px'
              }}>
                📋
              </div>
              <p style={{
                fontSize: '16px',
                fontWeight: '500',
                margin: 0,
                marginBottom: '8px'
              }}>
                No sub-accounts
              </p>
              <p style={{
                fontSize: '14px',
                margin: 0
              }}>
                Add sub-accounts using the form above.
              </p>
            </div>
          ) : (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead style={{
                  backgroundColor: '#f9fafb',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <tr>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Sub Account Name
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      width: '100px'
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formData.subAccounts.map((subAccount, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: index < formData.subAccounts.length - 1 ? '1px solid #e5e7eb' : 'none',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '14px',
                        color: '#374151',
                        fontWeight: '500'
                      }}>
                        {subAccount}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        textAlign: 'right'
                      }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubAccount(index)}
                          disabled={isSubAccountDisabled}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: isSubAccountDisabled ? 'transparent' : '#dc2626',
                            color: isSubAccountDisabled ? '#9ca3af' : 'white',
                            border: isSubAccountDisabled ? '1px solid #d1d5db' : 'none',
                            borderRadius: '6px',
                            cursor: isSubAccountDisabled ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                            opacity: isSubAccountDisabled ? 0.5 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!isSubAccountDisabled) {
                              e.currentTarget.style.backgroundColor = '#b91c1c';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSubAccountDisabled) {
                              e.currentTarget.style.backgroundColor = '#dc2626';
                            }
                          }}
                          title="Delete sub-account"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
            disabled={selectedAccount?.status !== StatusEnum.ACTIVE}
            style={{
              padding: '10px 20px',
              backgroundColor: selectedAccount?.status !== StatusEnum.ACTIVE ? 'transparent' : '#dc2626',
              color: selectedAccount?.status !== StatusEnum.ACTIVE ? '#9ca3af' : 'white',
              border: selectedAccount?.status !== StatusEnum.ACTIVE ? '1px solid #d1d5db' : 'none',
              borderRadius: '6px',
              cursor: selectedAccount?.status !== StatusEnum.ACTIVE ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: selectedAccount?.status !== StatusEnum.ACTIVE ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (selectedAccount?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#b91c1c';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedAccount?.status === StatusEnum.ACTIVE) {
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
            disabled={!isCreateMode && selectedAccount?.status !== StatusEnum.ACTIVE}
            style={{
              padding: '10px 20px',
              backgroundColor: (!isCreateMode && selectedAccount?.status !== StatusEnum.ACTIVE) ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (!isCreateMode && selectedAccount?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: (!isCreateMode && selectedAccount?.status !== StatusEnum.ACTIVE) ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (isCreateMode || selectedAccount?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (isCreateMode || selectedAccount?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {isCreateMode ? 'Create Account' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

