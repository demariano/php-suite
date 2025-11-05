'use client';

import { VoucherDto } from '@data-access/index';

interface PaymentDetailsTabProps {
  formData: VoucherDto;
  onFormDataChange: (updatedData: Partial<VoucherDto>) => void;
  isCreateMode: boolean;
  isReadOnly?: boolean;
}

export default function PaymentDetailsTab({
  formData,
  onFormDataChange,
  isCreateMode,
  isReadOnly = false
}: PaymentDetailsTabProps) {
  return (
    <div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '20px'
      }}>
        Payment Details
      </h3>

      {formData.paymentType && (
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
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                  {formData.paymentType}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                  {formData.chequeNo || '-'}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                  {formData.chequeDate || '-'}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                  {formData.bankName || '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!formData.paymentType && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          No payment details available
        </div>
      )}
    </div>
  );
}
