'use client';

import { PaymentDetailsDto, PaymentDto, PaymentTypeEnum, useSessionStore } from '@data-access/index';
import { useState } from 'react';
import DatePicker from '../../../../../components/DatePicker';
import NumberInput from '../../../../../components/NumberInput';

interface PaymentDetailsTabProps {
  formData: PaymentDto;
  onFormDataChange: (updatedData: Partial<PaymentDto>) => void;
  isCreateMode: boolean;
  isReadOnly?: boolean;
}

export default function PaymentDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  isReadOnly = false
}: PaymentDetailsTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newPaymentDetail, setNewPaymentDetail] = useState<PaymentDetailsDto>({
    paymentCreditDate: new Date().toISOString().split('T')[0],
    chequeNo: '',
    chequeDate: '',
    bankName: '',
    paymentType: PaymentTypeEnum.CASH,
    amount: 0
  });

  const { setFlashNotification } = useSessionStore();

  const handleAddPaymentDetail = () => {
    if (!newPaymentDetail.amount || newPaymentDetail.amount <= 0) {
      setFlashNotification({
        title: 'Validation Error',
        message: 'Payment amount must be greater than zero',
        alertType: 'error',
      });
      return;
    }

    // Validate cheque number uniqueness for CHEQUE type
    if (newPaymentDetail.paymentType === PaymentTypeEnum.CHEQUE) {
      const existingChequeNumbers = formData.paymentDetails?.map(detail => detail.chequeNo) || [];
      if (existingChequeNumbers.includes(newPaymentDetail.chequeNo)) {
        setFlashNotification({
          title: 'Validation Error',
          message: 'Cheque number must be unique',
          alertType: 'error',
        });
        return;
      }
    }

    const updatedPaymentDetails = [...(formData.paymentDetails || []), { ...newPaymentDetail }];
    const newPaymentAmount = updatedPaymentDetails.reduce((sum, detail) => sum + detail.amount, 0);

    onFormDataChange({
      paymentDetails: updatedPaymentDetails,
      paymentAmount: newPaymentAmount
    });

    // Reset form
    setNewPaymentDetail({
      paymentCreditDate: new Date().toISOString().split('T')[0],
      chequeNo: '',
      chequeDate: '',
      bankName: '',
      paymentType: PaymentTypeEnum.CASH,
      amount: 0
    });
    setShowAddModal(false);

    setFlashNotification({
      title: 'Success',
      message: 'Payment detail added successfully',
      alertType: 'success',
    });
  };

  const handleEditPaymentDetail = (index: number) => {
    const detail = formData.paymentDetails?.[index];
    if (detail) {
      setNewPaymentDetail({ ...detail });
      setEditingIndex(index);
      setShowAddModal(true);
    }
  };

  const handleUpdatePaymentDetail = () => {
    if (!newPaymentDetail.amount || newPaymentDetail.amount <= 0) {
      setFlashNotification({
        title: 'Validation Error',
        message: 'Payment amount must be greater than zero',
        alertType: 'error',
      });
      return;
    }

    // Validate cheque number uniqueness for CHEQUE type
    if (newPaymentDetail.paymentType === PaymentTypeEnum.CHEQUE) {
      const existingChequeNumbers = formData.paymentDetails?.map((detail, idx) => 
        idx !== editingIndex ? detail.chequeNo : ''
      ) || [];
      if (existingChequeNumbers.includes(newPaymentDetail.chequeNo)) {
        setFlashNotification({
          title: 'Validation Error',
          message: 'Cheque number must be unique',
          alertType: 'error',
        });
        return;
      }
    }

    const updatedPaymentDetails = [...(formData.paymentDetails || [])];
    updatedPaymentDetails[editingIndex!] = { ...newPaymentDetail };
    const newPaymentAmount = updatedPaymentDetails.reduce((sum, detail) => sum + detail.amount, 0);

    onFormDataChange({
      paymentDetails: updatedPaymentDetails,
      paymentAmount: newPaymentAmount
    });

    // Reset form
    setNewPaymentDetail({
      paymentCreditDate: new Date().toISOString().split('T')[0],
      chequeNo: '',
      chequeDate: '',
      bankName: '',
      paymentType: PaymentTypeEnum.CASH,
      amount: 0
    });
    setEditingIndex(null);
    setShowAddModal(false);

    setFlashNotification({
      title: 'Success',
      message: 'Payment detail updated successfully',
      alertType: 'success',
    });
  };

  const handleDeletePaymentDetail = (index: number) => {
    const updatedPaymentDetails = formData.paymentDetails?.filter((_, idx) => idx !== index) || [];
    const newPaymentAmount = updatedPaymentDetails.reduce((sum, detail) => sum + detail.amount, 0);

    onFormDataChange({
      paymentDetails: updatedPaymentDetails,
      paymentAmount: newPaymentAmount
    });

    setFlashNotification({
      title: 'Success',
      message: 'Payment detail deleted successfully',
      alertType: 'success',
    });
  };

  const handleCancelEdit = () => {
    setNewPaymentDetail({
      paymentCreditDate: new Date().toISOString().split('T')[0],
      chequeNo: '',
      chequeDate: '',
      bankName: '',
      paymentType: PaymentTypeEnum.CASH,
      amount: 0
    });
    setEditingIndex(null);
    setShowAddModal(false);
  };

  const getPaymentTypeLabel = (type: PaymentTypeEnum) => {
    switch (type) {
      case PaymentTypeEnum.CASH: return 'Cash';
      case PaymentTypeEnum.CHEQUE: return 'Cheque';
      case PaymentTypeEnum.BANK_TRANSFER: return 'Bank Transfer';
      case PaymentTypeEnum.OTHER: return 'Other';
      default: return type;
    }
  };

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          margin: 0
        }}>
          Payment Details
        </h3>
        {!isReadOnly && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            Add Payment Detail
          </button>
        )}
      </div>

      {formData.paymentDetails && formData.paymentDetails.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Type
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Cheque No
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Cheque Date
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Bank Name
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Credit Date
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
              {formData.paymentDetails.map((detail, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                    {getPaymentTypeLabel(detail.paymentType)}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                    {detail.paymentType === PaymentTypeEnum.CHEQUE ? detail.chequeNo : '-'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                    {detail.paymentType === PaymentTypeEnum.CHEQUE ? detail.chequeDate : '-'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                    {(detail.paymentType === PaymentTypeEnum.CHEQUE || detail.paymentType === PaymentTypeEnum.BANK_TRANSFER) ? detail.bankName : '-'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                    {detail.paymentCreditDate}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937', textAlign: 'right', fontWeight: '500' }}>
                    ${detail.amount.toFixed(2)}
                  </td>
                  {!isReadOnly && (
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleEditPaymentDetail(index)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#2563eb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#3b82f6';
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePaymentDetail(index)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
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
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6b7280',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          No payment details added yet
        </div>
      )}

      {/* Add/Edit Payment Detail Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '20px',
              margin: '0 0 20px 0'
            }}>
              {editingIndex !== null ? 'Edit Payment Detail' : 'Add Payment Detail'}
            </h3>

            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Payment Type */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Payment Type *
                </label>
                <select
                  value={newPaymentDetail.paymentType}
                  onChange={(e) => setNewPaymentDetail(prev => ({ ...prev, paymentType: e.target.value as PaymentTypeEnum }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value={PaymentTypeEnum.CASH}>Cash</option>
                  <option value={PaymentTypeEnum.CHEQUE}>Cheque</option>
                  <option value={PaymentTypeEnum.BANK_TRANSFER}>Bank Transfer</option>
                  <option value={PaymentTypeEnum.OTHER}>Other</option>
                </select>
              </div>

              {/* Cheque Number (only for CHEQUE type) */}
              {newPaymentDetail.paymentType === PaymentTypeEnum.CHEQUE && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Cheque Number *
                  </label>
                  <input
                    type="text"
                    value={newPaymentDetail.chequeNo}
                    onChange={(e) => setNewPaymentDetail(prev => ({ ...prev, chequeNo: e.target.value }))}
                    placeholder="Enter cheque number"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              )}

              {/* Cheque Date (only for CHEQUE type) */}
              {newPaymentDetail.paymentType === PaymentTypeEnum.CHEQUE && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Cheque Date *
                  </label>
                  <DatePicker
                    value={newPaymentDetail.chequeDate}
                    onChange={(date) => setNewPaymentDetail(prev => ({ ...prev, chequeDate: date }))}
                    placeholder="Select cheque date"
                  />
                </div>
              )}

              {/* Bank Name (for CHEQUE and BANK_TRANSFER) */}
              {(newPaymentDetail.paymentType === PaymentTypeEnum.CHEQUE || newPaymentDetail.paymentType === PaymentTypeEnum.BANK_TRANSFER) && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    value={newPaymentDetail.bankName}
                    onChange={(e) => setNewPaymentDetail(prev => ({ ...prev, bankName: e.target.value }))}
                    placeholder="Enter bank name"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              )}


              {/* Payment Credit Date */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Payment Credit Date *
                </label>
                <DatePicker
                  value={newPaymentDetail.paymentCreditDate}
                  onChange={(date) => setNewPaymentDetail(prev => ({ ...prev, paymentCreditDate: date }))}
                  placeholder="Select payment credit date"
                />
              </div>

              {/* Amount */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Amount *
                </label>
                <NumberInput
                  value={newPaymentDetail.amount}
                  onChange={(value) => setNewPaymentDetail(prev => ({ ...prev, amount: value }))}
                  placeholder="Enter amount"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px'
            }}>
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={editingIndex !== null ? handleUpdatePaymentDetail : handleAddPaymentDetail}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }}
              >
                {editingIndex !== null ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
