'use client';

import { VoucherDto } from '@data-access/index';

interface PaymentDetailsTabProps {
  formData: VoucherDto;
  onFormDataChange: (updatedData: Partial<VoucherDto>) => void;
  isCreateMode: boolean;
  isReadOnly?: boolean;
  isFieldChanged?: (fieldName: string) => boolean;
}

export default function PaymentDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  isReadOnly = false,
  isFieldChanged
}: PaymentDetailsTabProps) {
  return (
    <div className="space-y-6">
      {formData.paymentType && (
        <div className="mt-6">
          <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-gray-700">
                Payment Details
              </h4>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-white border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                        Cheque No
                      </th>
                      <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                        Cheque Date
                      </th>
                      <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">
                        Bank Name
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="transition-all duration-200 bg-white hover:bg-gray-50">
                      <td className="px-6 py-5 text-sm font-medium text-gray-900">
                        {formData.paymentType}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {formData.chequeNo || '-'}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {formData.chequeDate || '-'}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {formData.bankName || '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {!formData.paymentType && (
        <div className="p-10 text-center text-gray-500 text-base">
          No payment details available.
        </div>
      )}
    </div>
  );
}
