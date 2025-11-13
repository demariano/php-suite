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
    <div className="space-y-4">
      {/* Applied Invoices Section */}
      <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-blue-600">
              Applied Invoices
            </h3>
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleSearchInvoices}
              disabled={!formData.customerId}
              className={`px-4 py-2 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 ${
                formData.customerId
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-500 cursor-not-allowed opacity-60'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Invoices
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-600 mb-1">Total Payment Amount</div>
              <div className="text-lg font-semibold text-gray-900">
                ${formData.paymentAmount.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Applied Amount</div>
              <div className="text-lg font-semibold text-green-600">
                ${getTotalAppliedAmount().toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Remaining Amount</div>
              <div className={`text-lg font-semibold ${getRemainingAmount() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${getRemainingAmount().toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {formData.paymentInvoiceDetails && formData.paymentInvoiceDetails.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-white border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                      Invoice No
                    </th>
                    <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                      Invoice Amount
                    </th>
                    <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                      Applied Amount
                    </th>
                    {!isReadOnly && (
                      <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.paymentInvoiceDetails.map((detail, index) => (
                    <tr 
                      key={index}
                      className="transition-all duration-200 bg-white hover:bg-gray-50"
                    >
                      <td className="px-6 py-5 text-sm font-medium text-gray-900">
                        {detail.docno}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        ${detail.amountApplied.toFixed(2)}
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-gray-900">
                        ${detail.amountApplied.toFixed(2)}
                      </td>
                      {!isReadOnly && (
                        <td className="px-6 py-5">
                          <button
                            type="button"
                            onClick={() => handleDeleteInvoiceDetail(index)}
                            className="p-2 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center bg-red-600 hover:bg-red-700"
                            title="Remove"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
            <div className="p-10 text-center text-gray-500 text-base">
              No invoices applied yet. Click &quot;Search Invoices&quot; to get started.
            </div>
          </div>
        )}
      </div>

      {/* Invoice Selection Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-blue-600 m-0">
                Select Invoices to Apply
              </h3>
            </div>

            {isLoadingInvoices ? (
              <div className="text-center py-10">
                <div className="text-gray-500">Loading invoices...</div>
              </div>
            ) : pendingInvoices.length > 0 ? (
              <div className="mb-5">
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-white border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                            Select
                          </th>
                          <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                            Invoice No
                          </th>
                          <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                            Total Amount Paid
                          </th>
                          <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                            Final Amount
                          </th>
                          <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                            Remaining Balance
                          </th>
                          <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingInvoices.map((invoice, index) => {
                          const isSelected = selectedInvoices.some(selected => selected.invoiceId === invoice.invoiceId);
                          const isAlreadyApplied = formData.paymentInvoiceDetails?.some(detail => detail.invoiceId === invoice.invoiceId);
                          
                          return (
                            <tr 
                              key={index}
                              className="transition-all duration-200 bg-white hover:bg-gray-50"
                            >
                              <td className="px-6 py-5">
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
                                  className={`w-4 h-4 ${isAlreadyApplied ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                />
                              </td>
                              <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                {invoice.docno}
                              </td>
                              <td className="px-6 py-5 text-sm text-gray-600">
                                ${(invoice.totalAmountPaid || 0).toFixed(2)}
                              </td>
                              <td className="px-6 py-5 text-sm text-gray-600">
                                ${(invoice.finalAmount || 0).toFixed(2)}
                              </td>
                              <td className="px-6 py-5 text-sm text-gray-600">
                                ${((invoice.finalAmount || 0) - (invoice.totalAmountPaid || 0)).toFixed(2)}
                              </td>
                              <td className="px-6 py-5 text-sm text-gray-600">
                                {isAlreadyApplied ? (
                                  <span className="text-gray-500 italic">Already Applied</span>
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
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                <div className="p-10 text-center text-gray-500 text-base">
                  No pending payment invoices found
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoices([]);
                }}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplySelectedInvoices}
                disabled={selectedInvoices.length === 0}
                className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  selectedInvoices.length > 0
                    ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
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
