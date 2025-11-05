'use client';

import { AccountApi, AccountTypeEnum, AccountsDto, AreaDto, CustomerDto, PaymentTypeEnum, StatusEnum, VoucherDto, useSessionStore } from '@data-access/index';
import { useEffect, useState } from 'react';
import DatePicker from '../../../../../components/DatePicker';
import AccountSearchableSelectionModal from '../../../../../search-modals/AccountSearchableSelectionModal';
import AreaSearchableSelectionModal from '../../../../../search-modals/AreaSearchableSelectionModal';
import CustomerSearchableSelectionModal from '../../../../../search-modals/CustomerSearchableSelectionModal';

interface RecordDetailsTabProps {
  formData: VoucherDto;
  onFormDataChange: (updatedData: Partial<VoucherDto>) => void;
  isCreateMode: boolean;
  isAdminUser: boolean;
  isReadOnly?: boolean;
}

export default function RecordDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  isAdminUser,
  isReadOnly = false
}: RecordDetailsTabProps) {
  // State management for modals
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountsDto | null>(null);
  
  // Toast notification hook
  const { setFlashNotification } = useSessionStore();

  // Load account data when editing existing voucher
  useEffect(() => {
    const loadAccountData = async () => {
      if (formData.accountId && !isCreateMode && !selectedAccount) {
        try {
          const account = await AccountApi.getAccountById(formData.accountId);
          setSelectedAccount(account);
        } catch (error) {
          console.error('Error loading account data:', error);
        }
      }
    };
    
    loadAccountData();
  }, [formData.accountId, isCreateMode, selectedAccount]);

  // Handle account selection
  const handleAccountSelect = async (result: { account: AccountsDto; subAccount: string | null }) => {
    try {
      const account = result.account;
      setSelectedAccount(account);
      
      // Update form data with account info
      onFormDataChange({
        accountId: account.accountingId,
        accountName: account.accountName || '',
        accountType: account.accountType || AccountTypeEnum.OTHERS
      });

      // Clear customer/area based on account type
      if (account.accountType === AccountTypeEnum.CUSTOMER) {
        // Clear area fields
        onFormDataChange({
          areaId: '',
          areaName: ''
        });
      } else if (account.accountType === AccountTypeEnum.AREA) {
        // Clear customer fields
        onFormDataChange({
          customerId: '',
          customerName: ''
        });
      } else {
        // Clear both for OTHERS
        onFormDataChange({
          customerId: '',
          customerName: '',
          areaId: '',
          areaName: ''
        });
      }
    } catch (error) {
      console.error('Error processing account selection:', error);
    }
  };

  // Handle customer selection
  const handleCustomerSelect = async (customer: CustomerDto) => {
    try {
      // Update form data with customer info
      onFormDataChange({
        customerId: customer.customerId,
        customerName: customer.customerName || ''
      });
    } catch (error) {
      console.error('Error processing customer selection:', error);
    }
  };

  // Handle area selection
  const handleAreaSelect = async (area: AreaDto) => {
    try {
      // Update form data with area info
      onFormDataChange({
        areaId: area.areaId || '',
        areaName: area.areaName || ''
      });
    } catch (error) {
      console.error('Error processing area selection:', error);
    }
  };

  // Clear handlers
  const handleClearAccount = () => {
    setSelectedAccount(null);
    onFormDataChange({
      accountId: '',
      accountName: '',
      accountType: AccountTypeEnum.OTHERS,
      customerId: '',
      customerName: '',
      areaId: '',
      areaName: ''
    });
  };

  const handleClearCustomer = () => {
    onFormDataChange({
      customerId: '',
      customerName: ''
    });
  };

  const handleClearArea = () => {
    onFormDataChange({
      areaId: '',
      areaName: ''
    });
  };

  const getStatusBadge = (status: StatusEnum) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase";
    
    let colorClasses = "";
    if (status === StatusEnum.ACTIVE) {
      colorClasses = "!bg-green-100 !text-green-800";
    } else if (status === StatusEnum.FOR_APPROVAL) {
      colorClasses = "!bg-yellow-100 !text-yellow-800";
    } else if (status === StatusEnum.FOR_DELETION) {
      colorClasses = "!bg-red-100 !text-red-800";
    } else if (status === StatusEnum.NEW_RECORD) {
      colorClasses = "!bg-blue-100 !text-blue-800";
    } else {
      colorClasses = "!bg-gray-100 !text-gray-600";
    }
    
    return (
      <span className={`${baseClasses} ${colorClasses}`} style={{ backgroundColor: status === StatusEnum.ACTIVE ? '#dcfce7' : status === StatusEnum.FOR_APPROVAL ? '#fef3c7' : status === StatusEnum.FOR_DELETION ? '#fef2f2' : status === StatusEnum.NEW_RECORD ? '#dbeafe' : '#f3f4f6', color: status === StatusEnum.ACTIVE ? '#166534' : status === StatusEnum.FOR_APPROVAL ? '#92400e' : status === StatusEnum.FOR_DELETION ? '#dc2626' : status === StatusEnum.NEW_RECORD ? '#1e40af' : '#6b7280' }}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '20px'
      }}>
        Voucher Details
      </h3>

      {/* Change Reason Field - Only for non-admin users editing existing vouchers */}
      {!isCreateMode && !isAdminUser && !isReadOnly && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px 0 rgba(245, 158, 11, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
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
              📝
            </div>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#92400e',
              margin: 0
            }}>
              Change Reason *
            </h4>
          </div>
          <textarea
            value={formData.changeReason || ''}
            onChange={(e) => onFormDataChange({ changeReason: e.target.value })}
            placeholder="Please provide a reason for the changes (minimum 10 characters)"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#92400e',
              lineHeight: '1.5',
              backgroundColor: 'white',
              outline: 'none',
              resize: 'vertical',
              minHeight: '80px',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#d97706';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#f59e0b';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <div style={{
            fontSize: '12px',
            color: '#92400e',
            marginTop: '8px',
            fontStyle: 'italic'
          }}>
            Minimum 10 characters required
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Voucher Number *
          </label>
          <input
            type="text"
            value={formData.voucherNo || ''}
            onChange={(e) => onFormDataChange({ voucherNo: e.target.value })}
            readOnly={!isCreateMode || isReadOnly}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode || isReadOnly) ? '#f9fafb' : 'white'
            }}
            placeholder="Enter voucher number"
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Voucher Date *
          </label>
          <DatePicker
            value={formData.voucherDate || ''}
            onChange={(date) => onFormDataChange({ voucherDate: date })}
            placeholder="Select voucher date"
            disabled={!isCreateMode || isReadOnly}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Account Name *
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={formData.accountName || ''}
              readOnly
              onClick={() => isCreateMode && !isReadOnly && setShowAccountModal(true)}
              disabled={!isCreateMode || isReadOnly}
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: (formData.accountName && isCreateMode && !isReadOnly) ? '40px' : '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: (!isCreateMode || isReadOnly) ? '#f3f4f6' : '#f9fafb',
                color: formData.accountName ? '#1f2937' : '#6b7280',
                cursor: (isCreateMode && !isReadOnly) ? 'pointer' : 'not-allowed',
                outline: 'none',
                transition: 'all 0.2s ease',
                opacity: (!isCreateMode || isReadOnly) ? 0.6 : 1
              }}
              placeholder={(!isCreateMode || isReadOnly) ? "Account cannot be changed" : "Click to select account"}
              onMouseEnter={(e) => {
                if (isCreateMode && !isReadOnly) {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            
            {formData.accountName && isCreateMode && !isReadOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAccount();
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  zIndex: 10,
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#6b7280';
                }}
                title="Clear account selection"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Account Type
          </label>
          <input
            type="text"
            value={formData.accountType || ''}
            readOnly
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#f9fafb',
              color: '#6b7280'
            }}
            placeholder="Auto-populated from account"
          />
        </div>

        {/* Customer Name - Only enabled when accountType === 'CUSTOMER' */}
        {formData.accountType === AccountTypeEnum.CUSTOMER && (
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Customer Name *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={formData.customerName || ''}
                readOnly
                onClick={() => isCreateMode && !isReadOnly && setShowCustomerModal(true)}
                disabled={!isCreateMode || isReadOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingRight: (formData.customerName && isCreateMode && !isReadOnly) ? '40px' : '16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: (!isCreateMode || isReadOnly) ? '#f3f4f6' : '#f9fafb',
                  color: formData.customerName ? '#1f2937' : '#6b7280',
                  cursor: (isCreateMode && !isReadOnly) ? 'pointer' : 'not-allowed',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  opacity: (!isCreateMode || isReadOnly) ? 0.6 : 1
                }}
                placeholder={(!isCreateMode || isReadOnly) ? "Customer cannot be changed" : "Click to select customer"}
                onMouseEnter={(e) => {
                  if (isCreateMode && !isReadOnly) {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              
              {formData.customerName && isCreateMode && !isReadOnly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearCustomer();
                  }}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    zIndex: 10,
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#6b7280';
                  }}
                  title="Clear customer selection"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* Area Name - Only enabled when accountType === 'AREA' */}
        {formData.accountType === AccountTypeEnum.AREA && (
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Area Name *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={formData.areaName || ''}
                readOnly
                onClick={() => isCreateMode && !isReadOnly && setShowAreaModal(true)}
                disabled={!isCreateMode || isReadOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingRight: (formData.areaName && isCreateMode && !isReadOnly) ? '40px' : '16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: (!isCreateMode || isReadOnly) ? '#f3f4f6' : '#f9fafb',
                  color: formData.areaName ? '#1f2937' : '#6b7280',
                  cursor: (isCreateMode && !isReadOnly) ? 'pointer' : 'not-allowed',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  opacity: (!isCreateMode || isReadOnly) ? 0.6 : 1
                }}
                placeholder={(!isCreateMode || isReadOnly) ? "Area cannot be changed" : "Click to select area"}
                onMouseEnter={(e) => {
                  if (isCreateMode && !isReadOnly) {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              
              {formData.areaName && isCreateMode && !isReadOnly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearArea();
                  }}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    zIndex: 10,
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#6b7280';
                  }}
                  title="Clear area selection"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Remarks
          </label>
          <input
            type="text"
            value={formData.remarks || ''}
            onChange={(e) => onFormDataChange({ remarks: e.target.value })}
            readOnly={isReadOnly}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: isReadOnly ? '#f9fafb' : 'white'
            }}
            placeholder="Enter remarks"
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Payment Type
          </label>
          <select
            value={formData.paymentType || 'CASH'}
            onChange={(e) => onFormDataChange({ paymentType: e.target.value as PaymentTypeEnum })}
            disabled={isReadOnly}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: isReadOnly ? '#f9fafb' : 'white',
              cursor: isReadOnly ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="CASH">CASH</option>
            <option value="CHEQUE">CHEQUE</option>
            <option value="BANK_TRANSFER">BANK_TRANSFER</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        {/* Payment Type dependent fields */}
        {formData.paymentType === 'CHEQUE' && (
          <>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Bank Name
              </label>
              <input
                type="text"
                value={formData.bankName || ''}
                onChange={(e) => onFormDataChange({ bankName: e.target.value })}
                readOnly={isReadOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: isReadOnly ? '#f9fafb' : 'white'
                }}
                placeholder="Enter bank name"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Cheque Number
              </label>
              <input
                type="text"
                value={formData.chequeNo || ''}
                onChange={(e) => onFormDataChange({ chequeNo: e.target.value })}
                readOnly={isReadOnly}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: isReadOnly ? '#f9fafb' : 'white'
                }}
                placeholder="Enter cheque number"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Cheque Date
              </label>
              <DatePicker
                value={formData.chequeDate || ''}
                onChange={(date) => onFormDataChange({ chequeDate: date })}
                placeholder="Select cheque date"
                disabled={isReadOnly}
              />
            </div>
          </>
        )}
      </div>

      {/* Status Information */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Status
          </label>
          <div style={{ padding: '8px 0' }}>
            {getStatusBadge(formData.status || StatusEnum.ACTIVE)}
          </div>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Total Amount
          </label>
          <input
            type="number"
            value={formData.totalAmount || 0}
            readOnly
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#f9fafb',
              color: '#6b7280',
              fontWeight: '500'
            }}
          />
        </div>
      </div>

      {/* Account Selection Modal */}
      <AccountSearchableSelectionModal
        show={showAccountModal}
        title="Select Account"
        selectedAccountId={formData.accountId || null}
        onSelect={handleAccountSelect}
        onClose={() => setShowAccountModal(false)}
      />

      {/* Customer Selection Modal */}
      <CustomerSearchableSelectionModal
        show={showCustomerModal}
        title="Select Customer"
        selectedValue={formData.customerId || null}
        onSelect={handleCustomerSelect}
        onClose={() => setShowCustomerModal(false)}
      />

      {/* Area Selection Modal */}
      <AreaSearchableSelectionModal
        show={showAreaModal}
        title="Select Area"
        selectedValue={formData.areaId || null}
        onSelect={handleAreaSelect}
        onClose={() => setShowAreaModal(false)}
      />
    </div>
  );
}
