'use client';

import { InvoiceApi, InvoiceDto, PaymentDto, PaymentInvoiceDetailsDto, useSessionStore } from '@data-access/index';
import { useState } from 'react';

interface PaymentInvoiceDetailsTabProps {
  formData: PaymentDto;
  onFormDataChange: (updatedData: Partial<PaymentDto>) => void;
  isCreateMode: boolean;
  isReadOnly?: boolean;
}

export default function PaymentInvoiceDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  isReadOnly = false
}: PaymentInvoiceDetailsTabProps) {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [pendingInvoices, setPendingInvoices] = useState<InvoiceDto[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<InvoiceDto[]>([]);

  const { setFlashNotification } = useSessionStore();

  // Hide the entire component when contract payment is enabled
  if (formData.contractPayment) {
    return null;
  }

  // Load pending payment invoices when modal opens
  const loadPendingInvoices = async () => {
    if (!formData.customerId) {
      setFlashNotification({
        title: 'Error',
        message: 'Please select a customer first',
        alertType: 'error',
      });
      return;
    }

    try {
      setIsLoadingInvoices(true);
      // The backend already returns both PENDING and PARTIAL status invoices combined
      const invoices = await InvoiceApi.getPendingPaymentInvoices(formData.customerId, 'ACTIVE');
      
      // Add computed remainingBalance field to each invoice
      const invoicesWithRemainingBalance = (invoices || []).map(invoice => ({
        ...invoice,
        remainingBalance: (invoice.finalAmount || 0) - (invoice.totalAmountPaid || 0)
      }));
      
      setPendingInvoices(invoicesWithRemainingBalance);
    } catch (error) {
      console.error('Error loading pending invoices:', error);
      setFlashNotification({
        title: 'Error',
        message: 'Failed to load pending payment invoices',
        alertType: 'error',
      });
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const handleSearchInvoices = () => {
    if (!formData.customerId) {
      setFlashNotification({
        title: 'Error',
        message: 'Please select a customer first',
        alertType: 'error',
      });
      return;
    }
    setSelectedInvoices([]);
    loadPendingInvoices();
    setShowInvoiceModal(true);
  };

  const handleInvoiceSelect = (invoice: InvoiceDto) => {
    // Check if invoice is already selected
    if (selectedInvoices.some(selected => selected.invoiceId === invoice.invoiceId)) {
      setFlashNotification({
        title: 'Warning',
        message: 'This invoice is already selected',
        alertType: 'warning',
      });
      return;
    }

    // Check if invoice is already applied
    const existingInvoiceIds = formData.paymentInvoiceDetails?.map(detail => detail.invoiceId) || [];
    if (existingInvoiceIds.includes(invoice.invoiceId)) {
      setFlashNotification({
        title: 'Warning',
        message: 'This invoice is already applied to the payment',
        alertType: 'warning',
      });
      return;
    }

    setSelectedInvoices(prev => [...prev, invoice]);
  };

  const handleApplySelectedInvoices = () => {
    if (selectedInvoices.length === 0) {
      setFlashNotification({
        title: 'Warning',
        message: 'Please select at least one invoice',
        alertType: 'warning',
      });
      return;
    }

    const currentAppliedAmount = formData.paymentInvoiceDetails?.reduce((sum, detail) => sum + detail.amountApplied, 0) || 0;
    const remainingPaymentAmount = formData.paymentAmount - currentAppliedAmount;

    if (remainingPaymentAmount <= 0) {
      setFlashNotification({
        title: 'Error',
        message: 'The total payment amount has already been fully applied to invoices. Please increase the payment amount to apply to additional invoices.',
        alertType: 'error',
      });
      return;
    }

    const newInvoiceDetails: PaymentInvoiceDetailsDto[] = [];
    let totalToApply = 0;

    for (const invoice of selectedInvoices) {
      const invoiceAmount = (invoice.finalAmount || 0) - (invoice.totalAmountPaid || 0);
      const remainingAfterThis = remainingPaymentAmount - totalToApply;
      
      if (remainingAfterThis <= 0) {
        setFlashNotification({
          title: 'Error',
          message: 'The selected invoices total more than the remaining payment amount. Please reduce the number of selected invoices or increase the payment amount.',
          alertType: 'error',
        });
        return;
      }

      const amountToApply = Math.min(invoiceAmount, remainingAfterThis);
      
      newInvoiceDetails.push({
        invoiceId: invoice.invoiceId,
        docno: invoice.docno || '',
        amountApplied: amountToApply,
        receiptNo: formData.receiptNo,
        paymentDate: formData.paymentDate,
        paymentId: parseInt(formData.paymentId) || 0
      });

      totalToApply += amountToApply;
    }

    const updatedPaymentInvoiceDetails = [...(formData.paymentInvoiceDetails || []), ...newInvoiceDetails];
    onFormDataChange({
      paymentInvoiceDetails: updatedPaymentInvoiceDetails
    });

    setSelectedInvoices([]);
    setShowInvoiceModal(false);

    setFlashNotification({
      title: 'Success',
      message: `${selectedInvoices.length} invoice(s) applied successfully`,
      alertType: 'success',
    });
  };

  const handleDeleteInvoiceDetail = (index: number) => {
    const updatedPaymentInvoiceDetails = formData.paymentInvoiceDetails?.filter((_, idx) => idx !== index) || [];
    onFormDataChange({
      paymentInvoiceDetails: updatedPaymentInvoiceDetails
    });

    setFlashNotification({
      title: 'Success',
      message: 'Invoice application removed successfully',
      alertType: 'success',
    });
  };

  const getTotalAppliedAmount = () => {
    return formData.paymentInvoiceDetails?.reduce((sum, detail) => sum + detail.amountApplied, 0) || 0;
  };

  const getRemainingAmount = () => {
    return formData.paymentAmount - getTotalAppliedAmount();
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
          Applied Invoices
        </h3>
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleSearchInvoices}
            disabled={!formData.customerId}
            style={{
              padding: '8px 16px',
              backgroundColor: formData.customerId ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: formData.customerId ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (formData.customerId) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (formData.customerId) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            Search Invoices
          </button>
        )}
      </div>

      {/* Summary */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '6px',
        padding: '16px',
        marginBottom: '16px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Payment Amount</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              ${formData.paymentAmount.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Applied Amount</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#059669' }}>
              ${getTotalAppliedAmount().toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Remaining Amount</div>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: getRemainingAmount() >= 0 ? '#059669' : '#dc2626'
            }}>
              ${getRemainingAmount().toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {formData.paymentInvoiceDetails && formData.paymentInvoiceDetails.length > 0 ? (
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
                  Invoice No
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Invoice Amount
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Applied Amount
                </th>
                {!isReadOnly && (
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {formData.paymentInvoiceDetails.map((detail, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                    {detail.docno}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937', textAlign: 'right' }}>
                    ${(detail.amountApplied).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937', textAlign: 'right', fontWeight: '500' }}>
                    ${detail.amountApplied.toFixed(2)}
                  </td>
                  {!isReadOnly && (
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteInvoiceDetail(index)}
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
                        Remove
                      </button>
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
          No invoices applied yet
        </div>
      )}

      {/* Invoice Selection Modal */}
      {showInvoiceModal && (
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
            maxWidth: '800px',
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
              Select Invoices to Apply
            </h3>

            {isLoadingInvoices ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ color: '#6b7280' }}>Loading invoices...</div>
              </div>
            ) : pendingInvoices.length > 0 ? (
              <div style={{ marginBottom: '20px' }}>
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
                          Select
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                          Invoice No
                        </th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                          Total Amount Paid
                        </th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                          Final Amount
                        </th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                          Remaining Balance
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInvoices.map((invoice, index) => {
                        const isSelected = selectedInvoices.some(selected => selected.invoiceId === invoice.invoiceId);
                        const isAlreadyApplied = formData.paymentInvoiceDetails?.some(detail => detail.invoiceId === invoice.invoiceId);
                        
                        return (
                          <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isAlreadyApplied}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedInvoices(prev => prev.filter(selected => selected.invoiceId !== invoice.invoiceId));
                                  } else {
                                    setSelectedInvoices(prev => [...prev, invoice]);
                                  }
                                }}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  cursor: isAlreadyApplied ? 'not-allowed' : 'pointer'
                                }}
                              />
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                              {invoice.docno}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937', textAlign: 'right' }}>
                              ${(invoice.totalAmountPaid || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937', textAlign: 'right' }}>
                              ${(invoice.finalAmount || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937', textAlign: 'right' }}>
                              ${((invoice.finalAmount || 0) - (invoice.totalAmountPaid || 0)).toFixed(2)}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                              {isAlreadyApplied ? (
                                <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Already Applied</span>
                              ) : (
                                invoice.paymentStatus
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                No pending payment invoices found
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px'
            }}>
              <button
                type="button"
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoices([]);
                }}
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
                onClick={handleApplySelectedInvoices}
                disabled={selectedInvoices.length === 0}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedInvoices.length > 0 ? '#3b82f6' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedInvoices.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedInvoices.length > 0) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedInvoices.length > 0) {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }
                }}
              >
                Apply Selected ({selectedInvoices.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
