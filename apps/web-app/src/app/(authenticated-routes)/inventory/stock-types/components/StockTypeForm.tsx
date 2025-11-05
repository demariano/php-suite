'use client';

import { StatusEnum, StockTypeDto } from '@data-access/index';

interface StockTypeFormProps {
  isCreateMode: boolean;
  selectedStockType: StockTypeDto | null;
  successMessage: string | null;
  onSave: (stockType: StockTypeDto) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function StockTypeForm({
  isCreateMode,
  selectedStockType,
  successMessage,
  onSave,
  onDelete,
  onCancel
}: StockTypeFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const stockTypeName = formData.get('stockTypeName') as string;
    
    if (isCreateMode) {
      const newStockType = {
        stockTypeName: stockTypeName,
        status: StatusEnum.ACTIVE // Default status for new stock types
      };
      onSave(newStockType as StockTypeDto);
    } else {
      const updatedStockType = {
        ...selectedStockType,
        stockTypeName: stockTypeName,
        status: StatusEnum.ACTIVE
      };
      onSave(updatedStockType as StockTypeDto);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Success message */}
      {successMessage && (
        <div style={{
          backgroundColor: '#dcfce7',
          border: '2px solid #16a34a',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#16a34a',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ✓
          </div>
          <span style={{
            color: '#166534',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {successMessage}
          </span>
        </div>
      )}
      
      {/* Pending approval or deletion warning */}
      {!isCreateMode && selectedStockType && 
       (selectedStockType.status === StatusEnum.FOR_APPROVAL || selectedStockType.status === StatusEnum.NEW_RECORD || selectedStockType.status === StatusEnum.FOR_DELETION) && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#f59e0b',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ⚠
          </div>
          <span style={{
            color: '#92400e',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {selectedStockType.status === StatusEnum.FOR_DELETION 
              ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
              : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
          </span>
        </div>
      )}
      
      {/* Record Fields Container */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            backgroundColor: '#3b82f6',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            📋
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            Record Details
          </h3>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Stock Type Name
          </label>
          <input
            type="text"
            name="stockTypeName"
            defaultValue={isCreateMode ? '' : selectedStockType?.stockTypeName || ''}
            placeholder={isCreateMode ? 'Enter stock type name' : ''}
            disabled={!isCreateMode && selectedStockType?.status !== StatusEnum.ACTIVE}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: (!isCreateMode && selectedStockType?.status !== StatusEnum.ACTIVE) ? '#f9fafb' : 'white',
              color: (!isCreateMode && selectedStockType?.status !== StatusEnum.ACTIVE) ? '#6b7280' : 'inherit',
              transition: 'all 0.2s ease',
              cursor: (!isCreateMode && selectedStockType?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'text'
            }}
            onFocus={(e) => {
              if (isCreateMode || selectedStockType?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
            required
          />
        </div>
        
        {!isCreateMode && selectedStockType && (
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Status
            </label>
            <div style={{
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#f9fafb',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              {selectedStockType.status || 'ACTIVE'}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-6">
        {!isCreateMode && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            disabled={selectedStockType?.status !== StatusEnum.ACTIVE}
            style={{
              padding: '10px 20px',
              backgroundColor: selectedStockType?.status !== StatusEnum.ACTIVE ? 'transparent' : '#dc2626',
              color: selectedStockType?.status !== StatusEnum.ACTIVE ? '#9ca3af' : 'white',
              border: selectedStockType?.status !== StatusEnum.ACTIVE ? '1px solid #d1d5db' : 'none',
              borderRadius: '6px',
              cursor: selectedStockType?.status !== StatusEnum.ACTIVE ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: selectedStockType?.status !== StatusEnum.ACTIVE ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (selectedStockType?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#b91c1c';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedStockType?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }
            }}
          >
            Delete
          </button>
        )}
        
        <div className="flex gap-3 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isCreateMode && selectedStockType?.status !== StatusEnum.ACTIVE}
            style={{
              padding: '10px 20px',
              backgroundColor: (!isCreateMode && selectedStockType?.status !== StatusEnum.ACTIVE) ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (!isCreateMode && selectedStockType?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: (!isCreateMode && selectedStockType?.status !== StatusEnum.ACTIVE) ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (isCreateMode || selectedStockType?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (isCreateMode || selectedStockType?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {isCreateMode ? 'Create Stock Type' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

