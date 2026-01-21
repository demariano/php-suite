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
    isReadOnly = false,
}: PaymentDetailsTabProps) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [newPaymentDetail, setNewPaymentDetail] = useState<PaymentDetailsDto>({
        paymentCreditDate: new Date().toISOString().split('T')[0],
        chequeNo: '',
        chequeDate: '',
        bankName: '',
        paymentType: PaymentTypeEnum.CASH,
        amount: 0,
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
            const existingChequeNumbers = formData.paymentDetails?.map((detail) => detail.chequeNo) || [];
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
            paymentAmount: newPaymentAmount,
        });

        // Reset form
        setNewPaymentDetail({
            paymentCreditDate: new Date().toISOString().split('T')[0],
            chequeNo: '',
            chequeDate: '',
            bankName: '',
            paymentType: PaymentTypeEnum.CASH,
            amount: 0,
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
            const existingChequeNumbers =
                formData.paymentDetails?.map((detail, idx) => (idx !== editingIndex ? detail.chequeNo : '')) || [];
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
            paymentAmount: newPaymentAmount,
        });

        // Reset form
        setNewPaymentDetail({
            paymentCreditDate: new Date().toISOString().split('T')[0],
            chequeNo: '',
            chequeDate: '',
            bankName: '',
            paymentType: PaymentTypeEnum.CASH,
            amount: 0,
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
            paymentAmount: newPaymentAmount,
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
            amount: 0,
        });
        setEditingIndex(null);
        setShowAddModal(false);
    };

    const getPaymentTypeLabel = (type: PaymentTypeEnum) => {
        switch (type) {
            case PaymentTypeEnum.CASH:
                return 'Cash';
            case PaymentTypeEnum.CHEQUE:
                return 'Cheque';
            case PaymentTypeEnum.BANK_TRANSFER:
                return 'Bank Transfer';
            case PaymentTypeEnum.OTHER:
                return 'Other';
            default:
                return type;
        }
    };

    return (
        <div className="space-y-6">
            {/* Payment Details Section */}
            <div className="space-y-4">
                <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-blue-600">Payment Details</h3>
                        </div>
                        {!isReadOnly && (
                            <button
                                type="button"
                                onClick={() => setShowAddModal(true)}
                                className="px-4 py-2 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 bg-green-600 hover:bg-green-700"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                                Add Payment Detail
                            </button>
                        )}
                    </div>

                    {formData.paymentDetails && formData.paymentDetails.length > 0 ? (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse min-w-[1000px]">
                                    <thead className="bg-white border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider w-[100px]">
                                                Type
                                            </th>
                                            <th className="px-4 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider w-[120px]">
                                                Amount
                                            </th>
                                            <th className="px-4 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider w-[120px]">
                                                Cheque No
                                            </th>
                                            <th className="px-4 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider w-[130px]">
                                                Cheque Date
                                            </th>
                                            <th className="px-4 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider w-[150px]">
                                                Bank Name
                                            </th>
                                            <th className="px-4 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider w-[140px] min-w-[140px]">
                                                Credit Date
                                            </th>
                                            {!isReadOnly && (
                                                <th className="px-4 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider w-[120px]">
                                                    Actions
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {formData.paymentDetails.map((detail, index) => (
                                            <tr
                                                key={index}
                                                className="transition-all duration-200 bg-white hover:bg-gray-50"
                                            >
                                                <td className="px-4 py-5 text-sm font-medium text-gray-900">
                                                    {getPaymentTypeLabel(detail.paymentType)}
                                                </td>
                                                <td className="px-4 py-5 text-sm font-medium text-gray-900">
                                                    ₱{detail.amount.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-5 text-sm text-gray-600">
                                                    {detail.paymentType === PaymentTypeEnum.CHEQUE
                                                        ? detail.chequeNo
                                                        : '-'}
                                                </td>
                                                <td className="px-4 py-5 text-sm text-gray-600">
                                                    {detail.paymentType === PaymentTypeEnum.CHEQUE
                                                        ? detail.chequeDate
                                                        : '-'}
                                                </td>
                                                <td className="px-4 py-5 text-sm text-gray-600">
                                                    {detail.paymentType === PaymentTypeEnum.CHEQUE ||
                                                    detail.paymentType === PaymentTypeEnum.BANK_TRANSFER
                                                        ? detail.bankName
                                                        : '-'}
                                                </td>
                                                <td className="px-4 py-5 text-sm text-gray-600 whitespace-nowrap">
                                                    {detail.paymentCreditDate}
                                                </td>
                                                {!isReadOnly && (
                                                    <td className="px-4 py-5">
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditPaymentDetail(index)}
                                                                className="p-2 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center bg-blue-600 hover:bg-blue-700"
                                                                title="Edit"
                                                            >
                                                                <svg
                                                                    className="w-5 h-5"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                                    />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeletePaymentDetail(index)}
                                                                className="p-2 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center bg-red-600 hover:bg-red-700"
                                                                title="Remove"
                                                            >
                                                                <svg
                                                                    className="w-5 h-5"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        </div>
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
                                No payment details added yet. Click &quot;Add Payment Detail&quot; to get started.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Payment Detail Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-blue-600 m-0">
                                {editingIndex !== null ? 'Edit Payment Detail' : 'Add Payment Detail'}
                            </h3>
                        </div>

                        <div className="space-y-4">
                            {/* Payment Type */}
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                    Payment Type *
                                </label>
                                <select
                                    value={newPaymentDetail.paymentType}
                                    onChange={(e) =>
                                        setNewPaymentDetail((prev) => ({
                                            ...prev,
                                            paymentType: e.target.value as PaymentTypeEnum,
                                        }))
                                    }
                                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    <option value={PaymentTypeEnum.CASH}>Cash</option>
                                    <option value={PaymentTypeEnum.CHEQUE}>Cheque</option>
                                    <option value={PaymentTypeEnum.BANK_TRANSFER}>Bank Transfer</option>
                                    <option value={PaymentTypeEnum.OTHER}>Other</option>
                                </select>
                            </div>

                            {/* Cheque Number (only for CHEQUE type) */}
                            {newPaymentDetail.paymentType === PaymentTypeEnum.CHEQUE && (
                                <div className="group">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        Cheque Number *
                                    </label>
                                    <input
                                        type="text"
                                        value={newPaymentDetail.chequeNo}
                                        onChange={(e) =>
                                            setNewPaymentDetail((prev) => ({ ...prev, chequeNo: e.target.value }))
                                        }
                                        placeholder="Enter cheque number"
                                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    />
                                </div>
                            )}

                            {/* Cheque Date (only for CHEQUE type) */}
                            {newPaymentDetail.paymentType === PaymentTypeEnum.CHEQUE && (
                                <div className="group">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        Cheque Date *
                                    </label>
                                    <DatePicker
                                        value={newPaymentDetail.chequeDate}
                                        onChange={(date) =>
                                            setNewPaymentDetail((prev) => ({ ...prev, chequeDate: date }))
                                        }
                                        placeholder="Select cheque date"
                                    />
                                </div>
                            )}

                            {/* Bank Name (for CHEQUE and BANK_TRANSFER) */}
                            {(newPaymentDetail.paymentType === PaymentTypeEnum.CHEQUE ||
                                newPaymentDetail.paymentType === PaymentTypeEnum.BANK_TRANSFER) && (
                                <div className="group">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        Bank Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={newPaymentDetail.bankName}
                                        onChange={(e) =>
                                            setNewPaymentDetail((prev) => ({ ...prev, bankName: e.target.value }))
                                        }
                                        placeholder="Enter bank name"
                                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    />
                                </div>
                            )}

                            {/* Payment Credit Date */}
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                    Payment Credit Date *
                                </label>
                                <DatePicker
                                    value={newPaymentDetail.paymentCreditDate}
                                    onChange={(date) =>
                                        setNewPaymentDetail((prev) => ({ ...prev, paymentCreditDate: date }))
                                    }
                                    placeholder="Select payment credit date"
                                />
                            </div>

                            {/* Amount */}
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                    Amount *
                                </label>
                                <NumberInput
                                    value={newPaymentDetail.amount}
                                    onChange={(value) => setNewPaymentDetail((prev) => ({ ...prev, amount: value }))}
                                    placeholder="Enter amount"
                                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 group-hover:border-blue-300 group-hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end mt-8 border-t-2 border-gray-200 pt-6">
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={editingIndex !== null ? handleUpdatePaymentDetail : handleAddPaymentDetail}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                {editingIndex !== null ? 'Update' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
