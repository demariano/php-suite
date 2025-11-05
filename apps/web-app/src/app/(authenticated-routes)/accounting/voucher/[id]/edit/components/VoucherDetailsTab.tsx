'use client';

import { AccountApi, AccountsDto, VoucherDetailDto, VoucherDto, useSessionStore } from '@data-access/index';
import { useEffect, useState } from 'react';

interface VoucherDetailsTabProps {
  formData: VoucherDto;
  onFormDataChange: (updatedData: Partial<VoucherDto>) => void;
  isCreateMode: boolean;
  isReadOnly?: boolean;
}



export default function VoucherDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  isReadOnly = false
}: VoucherDetailsTabProps) {
  const [selectedAccount, setSelectedAccount] = useState<AccountsDto | null>(null);
  const [selectedSubAccount, setSelectedSubAccount] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isTypingAmount, setIsTypingAmount] = useState(false);
  const [editingAmounts, setEditingAmounts] = useState<{ [index: number]: string }>({});
  const [isTypingTableAmounts, setIsTypingTableAmounts] = useState<{ [index: number]: boolean }>({});
  
  const { setFlashNotification } = useSessionStore();

  // Number formatting utilities
  const formatNumberWithCommas = (value: string | number): string => {
    if (!value && value !== 0) return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const removeCommas = (value: string): string => {
    return value.replace(/,/g, '');
  };

  // Load account data when accountId changes
  useEffect(() => {
    const loadAccountData = async () => {
      if (formData.accountId) {
        try {
          const account = await AccountApi.getAccountById(formData.accountId);
          setSelectedAccount(account);
        } catch (error) {
          console.error('Error loading account data:', error);
        }
      } else {
        setSelectedAccount(null);
      }
    };
    
    loadAccountData();
  }, [formData.accountId]);

  // Compute totalAmount whenever voucherDetails change
  useEffect(() => {
    if (formData.voucherDetails && formData.voucherDetails.length > 0) {
      const total = formData.voucherDetails.reduce((sum, detail) => sum + (detail.amount || 0), 0);
      onFormDataChange({ totalAmount: Math.round(total * 100) / 100 });
    } else {
      onFormDataChange({ totalAmount: 0 });
    }
  }, [formData.voucherDetails]);

  // Auto-format when user stops typing (using timeout) for add detail amount
  useEffect(() => {
    if (amount && isTypingAmount) {
      const timer = setTimeout(() => {
        const rawValue = removeCommas(amount);
        const numericValue = parseFloat(rawValue);
        if (!isNaN(numericValue)) {
          const formatted = formatNumberWithCommas(numericValue);
          setAmount(formatted);
          setIsTypingAmount(false);
        }
      }, 500); // Format after 0.5 seconds of no typing

      return () => clearTimeout(timer);
    }
  }, [amount, isTypingAmount]);

  // Auto-format when user stops typing (using timeout) for table amount fields
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    Object.keys(isTypingTableAmounts).forEach((indexStr) => {
      const index = parseInt(indexStr);
      if (isTypingTableAmounts[index] && editingAmounts[index]) {
        const timer = setTimeout(() => {
          const rawValue = removeCommas(editingAmounts[index]);
          const numericValue = parseFloat(rawValue);
          if (!isNaN(numericValue)) {
            const formatted = formatNumberWithCommas(numericValue);
            setEditingAmounts(prev => ({ ...prev, [index]: formatted }));
            setIsTypingTableAmounts(prev => ({ ...prev, [index]: false }));
            
            // Update the actual voucher detail
            const updatedDetails = [...(formData.voucherDetails || [])];
            updatedDetails[index] = {
              ...updatedDetails[index],
              amount: Math.round(numericValue * 100) / 100
            };
            onFormDataChange({ voucherDetails: updatedDetails });
          }
        }, 500);
        
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [editingAmounts, isTypingTableAmounts, formData.voucherDetails, onFormDataChange]);

  const handleAddDetailAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = removeCommas(e.target.value);
    // Only allow numbers and decimal point
    const numericValue = rawValue.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;
    
    setIsTypingAmount(true);
    setAmount(cleanValue);
  };

  const handleAddDetailAmountBlur = () => {
    const rawValue = removeCommas(amount);
    if (rawValue) {
      const numericValue = parseFloat(rawValue);
      if (!isNaN(numericValue)) {
        const formatted = formatNumberWithCommas(numericValue);
        setAmount(formatted);
      }
    }
    setIsTypingAmount(false);
  };

  const handleAddDetailAmountFocus = () => {
    if (amount) {
      const raw = removeCommas(amount);
      setAmount(raw);
    }
    setIsTypingAmount(true);
  };

  const getAddDetailAmountDisplayValue = () => {
    return amount;
  };

  const handleAddDetail = () => {
    if (!selectedSubAccount || selectedSubAccount.trim() === '') {
      setFlashNotification({
        title: 'Validation Error',
        message: 'Please select a sub account before adding.',
        alertType: 'error'
      });
      return;
    }

    const rawValue = removeCommas(amount);
    const numericValue = parseFloat(rawValue);
    
    if (!numericValue || numericValue <= 0 || isNaN(numericValue)) {
      setFlashNotification({
        title: 'Validation Error',
        message: 'Please enter a valid amount greater than zero.',
        alertType: 'error'
      });
      return;
    }

    // Check for duplicate subAccount
    const hasDuplicate = (formData.voucherDetails || []).some(
      detail => detail.subAccount === selectedSubAccount
    );

    if (hasDuplicate) {
      setFlashNotification({
        title: 'Duplicate Item',
        message: 'This sub account is already added. No duplication allowed.',
        alertType: 'warning'
      });
      return;
    }

    const newDetail: VoucherDetailDto = {
      subAccount: selectedSubAccount,
      amount: Math.round(numericValue * 100) / 100
    };

    const updatedDetails = [...(formData.voucherDetails || []), newDetail];
    onFormDataChange({ voucherDetails: updatedDetails });

    // Reset form
    setSelectedSubAccount('');
    setAmount('');
    setIsTypingAmount(false);
  };

  const handleDeleteDetail = (index: number) => {
    const updatedDetails = [...(formData.voucherDetails || [])];
    updatedDetails.splice(index, 1);
    onFormDataChange({ voucherDetails: updatedDetails });
    
    // Clean up editing state for deleted item and adjust indices
    setEditingAmounts(prev => {
      const newState: { [index: number]: string } = {};
      Object.keys(prev).forEach(key => {
        const prevIndex = parseInt(key);
        if (prevIndex < index) {
          newState[prevIndex] = prev[prevIndex];
        } else if (prevIndex > index) {
          newState[prevIndex - 1] = prev[prevIndex];
        }
      });
      return newState;
    });
    
    setIsTypingTableAmounts(prev => {
      const newState: { [index: number]: boolean } = {};
      Object.keys(prev).forEach(key => {
        const prevIndex = parseInt(key);
        if (prevIndex < index) {
          newState[prevIndex] = prev[prevIndex];
        } else if (prevIndex > index) {
          newState[prevIndex - 1] = prev[prevIndex];
        }
      });
      return newState;
    });
  };

  const handleAmountChange = (index: number, newAmount: number) => {
    const updatedDetails = [...(formData.voucherDetails || [])];
    updatedDetails[index] = {
      ...updatedDetails[index],
      amount: Math.round(newAmount * 100) / 100
    };
    onFormDataChange({ voucherDetails: updatedDetails });
  };

  const handleTableAmountChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = removeCommas(e.target.value);
    // Only allow numbers and decimal point
    const numericValue = rawValue.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;
    
    setEditingAmounts(prev => ({ ...prev, [index]: cleanValue }));
    setIsTypingTableAmounts(prev => ({ ...prev, [index]: true }));
  };

  const handleTableAmountBlur = (index: number) => {
    const rawValue = removeCommas(editingAmounts[index] || '');
    if (rawValue) {
      const numericValue = parseFloat(rawValue);
      if (!isNaN(numericValue)) {
        const formatted = formatNumberWithCommas(numericValue);
        setEditingAmounts(prev => ({ ...prev, [index]: formatted }));
        
        // Update the actual voucher detail
        const updatedDetails = [...(formData.voucherDetails || [])];
        updatedDetails[index] = {
          ...updatedDetails[index],
          amount: Math.round(numericValue * 100) / 100
        };
        onFormDataChange({ voucherDetails: updatedDetails });
      }
    }
    setIsTypingTableAmounts(prev => ({ ...prev, [index]: false }));
  };

  const handleTableAmountFocus = (index: number) => {
    const detail = formData.voucherDetails?.[index];
    if (detail?.amount !== undefined) {
      const raw = detail.amount.toString();
      setEditingAmounts(prev => ({ ...prev, [index]: raw }));
    }
    setIsTypingTableAmounts(prev => ({ ...prev, [index]: true }));
  };

  const getTableAmountDisplayValue = (index: number) => {
    if (editingAmounts[index] !== undefined) {
      return editingAmounts[index];
    }
    const detail = formData.voucherDetails?.[index];
    if (detail?.amount !== undefined) {
      return formatNumberWithCommas(detail.amount);
    }
    return '';
  };

  const subAccounts = selectedAccount?.subAccounts || [];
  const availableSubAccounts = subAccounts.filter(
    subAccount => !(formData.voucherDetails || []).some(detail => detail.subAccount === subAccount)
  );

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

      {/* Add Detail Section - Hidden when read-only */}
      {!isReadOnly && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '16px'
          }}>
            Add Voucher Detail
          </h4>

          {!formData.accountId ? (
            <div style={{
              padding: '16px',
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              color: '#92400e'
            }}>
              Please select an account first before adding voucher details.
            </div>
          ) : subAccounts.length === 0 ? (
            <div style={{
              padding: '16px',
              backgroundColor: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              color: '#991b1b'
            }}>
              The selected account has no sub accounts available.
            </div>
          ) : availableSubAccounts.length === 0 ? (
            <div style={{
              padding: '16px',
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              color: '#92400e'
            }}>
              All sub accounts have been added. No more items can be added.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto',
              gap: '16px',
              alignItems: 'end'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Sub Account *
                </label>
                <select
                  value={selectedSubAccount}
                  onChange={(e) => setSelectedSubAccount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Select sub account</option>
                  {availableSubAccounts.map((subAccount) => (
                    <option key={subAccount} value={subAccount}>
                      {subAccount}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Amount *
                </label>
                <input
                  type="text"
                  value={getAddDetailAmountDisplayValue()}
                  onChange={handleAddDetailAmountChange}
                  onFocus={handleAddDetailAmountFocus}
                  onBlur={handleAddDetailAmountBlur}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  placeholder="Enter amount"
                />
              </div>

              <button
                type="button"
                onClick={handleAddDetail}
                disabled={!selectedSubAccount || !amount || parseFloat(removeCommas(amount)) <= 0}
                style={{
                  padding: '12px 20px',
                  backgroundColor: (!selectedSubAccount || !amount || parseFloat(removeCommas(amount)) <= 0) ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (!selectedSubAccount || !amount || parseFloat(removeCommas(amount)) <= 0) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  opacity: (!selectedSubAccount || !amount || parseFloat(removeCommas(amount)) <= 0) ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (selectedSubAccount && amount && parseFloat(removeCommas(amount)) > 0) {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedSubAccount && amount && parseFloat(removeCommas(amount)) > 0) {
                    e.currentTarget.style.backgroundColor = '#10b981';
                  }
                }}
              >
                Add Detail
              </button>
            </div>
          )}
        </div>
      )}

      {/* Voucher Details Table */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            Voucher Details ({formData.voucherDetails?.length || 0} items)
          </h4>
        </div>

        {formData.voucherDetails && formData.voucherDetails.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'white'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                    Sub Account
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                    Amount
                  </th>
                  {!isReadOnly && (
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {formData.voucherDetails.map((detail, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                      {detail.subAccount}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937', textAlign: 'right' }}>
                      {isReadOnly ? (
                        <span>{formatNumberWithCommas(detail.amount || 0)}</span>
                      ) : (
                        <input
                          type="text"
                          value={getTableAmountDisplayValue(index)}
                          onChange={(e) => handleTableAmountChange(index, e)}
                          onFocus={() => handleTableAmountFocus(index)}
                          onBlur={() => handleTableAmountBlur(index)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            textAlign: 'right',
                            outline: 'none'
                          }}
                        />
                      )}
                    </td>
                    {!isReadOnly && (
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteDetail(index)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#b91c1c';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc2626';
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: '600' }}>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                    Total
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937', textAlign: 'right' }}>
                    {formatNumberWithCommas(formData.totalAmount || 0)}
                  </td>
                  {!isReadOnly && (
                    <td style={{ padding: '12px' }}></td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            No voucher details added yet
          </div>
        )}
      </div>
    </div>
  );
}
