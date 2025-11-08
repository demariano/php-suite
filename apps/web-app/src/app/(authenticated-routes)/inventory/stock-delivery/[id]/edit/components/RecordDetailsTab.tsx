'use client';

import { StatusEnum, StockDeliveryDto, SupplierDto, useSessionStore } from '@data-access/index';
import { useState } from 'react';
import DatePicker from '../../../../../components/DatePicker';
import SupplierSearchableSelectionModal from '../../../../../search-modals/SupplierSearchableSelectionModal';

interface RecordDetailsTabProps {
  formData: StockDeliveryDto;
  onFormDataChange: (updatedData: Partial<StockDeliveryDto>) => void;
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
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const { setFlashNotification } = useSessionStore();

  // Handle supplier selection
  const handleSupplierSelect = (supplier: SupplierDto) => {
    onFormDataChange({
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName
    });
  };

  const handleClearSupplier = () => {
    onFormDataChange({ supplierId: '', supplierName: '' });
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
        Stock Delivery Details
      </h3>

      {/* Change Reason Field - Only for non-admin users editing existing records */}
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
            Document Number *
          </label>
          <input
            type="text"
            value={formData.docno || ''}
            onChange={(e) => onFormDataChange({ docno: e.target.value })}
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
            placeholder="Enter document number"
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
            Date Received *
          </label>
          <DatePicker
            value={formData.dateReceived || ''}
            onChange={(date) => onFormDataChange({ dateReceived: date })}
            placeholder="Select date received"
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
            Supplier Name *
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={formData.supplierName || ''}
              readOnly
              onClick={() => isCreateMode && !isReadOnly && setShowSupplierModal(true)}
              disabled={!isCreateMode || isReadOnly}
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: (formData.supplierName && isCreateMode && !isReadOnly) ? '40px' : '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: (!isCreateMode || isReadOnly) ? '#f3f4f6' : '#f9fafb',
                color: formData.supplierName ? '#1f2937' : '#6b7280',
                cursor: (isCreateMode && !isReadOnly) ? 'pointer' : 'not-allowed',
                outline: 'none',
                transition: 'all 0.2s ease',
                opacity: (!isCreateMode || isReadOnly) ? 0.6 : 1
              }}
              placeholder={(!isCreateMode || isReadOnly) ? "Supplier cannot be changed" : "Click to select supplier"}
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
            
            {formData.supplierName && isCreateMode && !isReadOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSupplier();
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
                title="Clear supplier selection"
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
            Status
          </label>
          <div style={{ padding: '8px 0' }}>
            {getStatusBadge(formData.status || StatusEnum.ACTIVE)}
          </div>
        </div>
      </div>

      {/* Supplier Selection Modal */}
      <SupplierSearchableSelectionModal
        show={showSupplierModal}
        title="Select Supplier"
        selectedValue={formData.supplierId || null}
        onSelect={handleSupplierSelect}
        onClose={() => setShowSupplierModal(false)}
      />
    </div>
  );
}

