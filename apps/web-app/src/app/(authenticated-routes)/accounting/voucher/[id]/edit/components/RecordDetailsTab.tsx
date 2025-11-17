'use client';

import { AccountApi, AccountTypeEnum, AccountsDto, AreaDto, CustomerDto, PaymentTypeEnum, StatusEnum, VoucherDto, useSessionStore } from '@data-access/index';
import { useEffect, useState } from 'react';
import DatePicker from '../../../../../components/DatePicker';
import AccountSearchableSelectionModal from '../../../../../search-modals/AccountSearchableSelectionModal';
import AreaSearchableSelectionModal from '../../../../../search-modals/AreaSearchableSelectionModal';
import CustomerSearchableSelectionModal from '../../../../../search-modals/CustomerSearchableSelectionModal';
import { SelectionField } from '../../../components';

interface RecordDetailsTabProps {
  formData: VoucherDto;
  onFormDataChange: (updatedData: Partial<VoucherDto>) => void;
  isCreateMode: boolean;
  isAdminUser: boolean;
  isReadOnly?: boolean;
  isFieldChanged?: (fieldName: string) => boolean;
}

export default function RecordDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  isAdminUser,
  isReadOnly = false,
  isFieldChanged
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
    <div className="space-y-6">
      {/* Change Reason Field - Only for non-admin users editing existing vouchers */}
      {!isCreateMode && !isAdminUser && !isReadOnly && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-yellow-900">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-600" />
              <span>Change Reason</span>
            </label>
          </div>
          <textarea
            value={formData.changeReason || ''}
            onChange={(e) => onFormDataChange({ changeReason: e.target.value })}
            placeholder="Please provide a reason for the changes (minimum 10 characters)"
            className="w-full rounded-xl border-2 border-yellow-400 px-4 py-3 text-sm text-yellow-900 bg-white shadow-sm transition-all duration-200 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 resize-vertical min-h-[80px]"
          />
          <p className="mt-2 text-xs text-yellow-800 italic">
            Minimum 10 characters required
          </p>
        </div>
      )}

      {/* Basic Information Section */}
      <div className="space-y-4">
        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-blue-600">
              Basic Information
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Voucher Number */}
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Voucher Number
              </label>
              <input
                type="text"
                value={formData.voucherNo || ''}
                onChange={(e) => onFormDataChange({ voucherNo: e.target.value })}
                readOnly={!isCreateMode || isReadOnly}
                disabled={!isCreateMode || isReadOnly}
                placeholder={isCreateMode ? 'Enter voucher number' : ''}
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                  isFieldChanged && isFieldChanged('voucherNo')
                    ? 'border-blue-500 bg-blue-50 text-gray-700'
                    : !isCreateMode || isReadOnly
                    ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                    : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40'
                }`}
              />
            </div>

            {/* Voucher Date */}
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Voucher Date
              </label>
              <DatePicker
                value={formData.voucherDate || ''}
                onChange={(date) => onFormDataChange({ voucherDate: date })}
                placeholder="Select voucher date"
                disabled={!isCreateMode || isReadOnly}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Account Information Section */}
      <div className="space-y-4">
        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-blue-600">
              Account Information
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Name */}
            <div className="group">
              <SelectionField
                label="Account Name"
                selectedItem={formData.accountName ? { id: formData.accountId || '', name: formData.accountName } : null}
                onSelect={() => setShowAccountModal(true)}
                onClear={handleClearAccount}
                buttonText="Select account"
                disabled={!isCreateMode || isReadOnly}
                isHighlighted={isFieldChanged && (isFieldChanged('accountId') || isFieldChanged('accountName'))}
              />
            </div>

            {/* Account Type */}
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Account Type
              </label>
              <input
                type="text"
                value={formData.accountType || ''}
                readOnly
                disabled
                placeholder="Auto-populated from account"
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm cursor-not-allowed ${
                  isFieldChanged && isFieldChanged('accountType')
                    ? 'border-blue-500 bg-blue-50 text-gray-700'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}
              />
            </div>

            {/* Customer Name - Conditional */}
            {formData.accountType === AccountTypeEnum.CUSTOMER && (
              <div className="group">
                <SelectionField
                  label="Customer Name"
                  selectedItem={formData.customerName ? { id: formData.customerId || '', name: formData.customerName } : null}
                  onSelect={() => setShowCustomerModal(true)}
                  onClear={handleClearCustomer}
                  buttonText="Select customer"
                  disabled={!isCreateMode || isReadOnly}
                  isHighlighted={isFieldChanged && (isFieldChanged('customerId') || isFieldChanged('customerName'))}
                />
              </div>
            )}

            {/* Area Name - Conditional */}
            {formData.accountType === AccountTypeEnum.AREA && (
              <div className="group">
                <SelectionField
                  label="Area Name"
                  selectedItem={formData.areaName ? { id: formData.areaId || '', name: formData.areaName } : null}
                  onSelect={() => setShowAreaModal(true)}
                  onClear={handleClearArea}
                  buttonText="Select area"
                  disabled={!isCreateMode || isReadOnly}
                  isHighlighted={isFieldChanged && (isFieldChanged('areaId') || isFieldChanged('areaName'))}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Information Section */}
      <div className="space-y-4">
        <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-blue-600">
              Payment Information
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Type */}
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Payment Type
              </label>
              <select
                value={formData.paymentType || 'CASH'}
                onChange={(e) => onFormDataChange({ paymentType: e.target.value as PaymentTypeEnum })}
                disabled={isReadOnly}
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                  isFieldChanged && isFieldChanged('paymentType')
                    ? 'border-blue-500 bg-blue-50 text-gray-700'
                    : isReadOnly
                    ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                    : 'border-gray-200 bg-white text-gray-700 cursor-pointer group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40'
                }`}
              >
                <option value="CASH">CASH</option>
                <option value="CHEQUE">CHEQUE</option>
                <option value="BANK_TRANSFER">BANK TRANSFER</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            {/* Remarks */}
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Remarks
              </label>
              <input
                type="text"
                value={formData.remarks || ''}
                onChange={(e) => onFormDataChange({ remarks: e.target.value })}
                readOnly={isReadOnly}
                disabled={isReadOnly}
                placeholder={isCreateMode ? 'Enter remarks' : ''}
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                  isFieldChanged && isFieldChanged('remarks')
                    ? 'border-blue-500 bg-blue-50 text-gray-700'
                    : isReadOnly
                    ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                    : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40'
                }`}
              />
            </div>

            {/* Cheque-specific fields */}
            {formData.paymentType === 'CHEQUE' && (
              <>
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankName || ''}
                    onChange={(e) => onFormDataChange({ bankName: e.target.value })}
                    readOnly={isReadOnly}
                    disabled={isReadOnly}
                    placeholder={isCreateMode ? 'Enter bank name' : ''}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                      isFieldChanged && isFieldChanged('bankName')
                        ? 'border-blue-500 bg-blue-50 text-gray-700'
                        : isReadOnly
                        ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                        : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40'
                    }`}
                  />
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Cheque Number
                  </label>
                  <input
                    type="text"
                    value={formData.chequeNo || ''}
                    onChange={(e) => onFormDataChange({ chequeNo: e.target.value })}
                    readOnly={isReadOnly}
                    disabled={isReadOnly}
                    placeholder={isCreateMode ? 'Enter cheque number' : ''}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 ${
                      isFieldChanged && isFieldChanged('chequeNo')
                        ? 'border-blue-500 bg-blue-50 text-gray-700'
                        : isReadOnly
                        ? 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                        : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40'
                    }`}
                  />
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
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
