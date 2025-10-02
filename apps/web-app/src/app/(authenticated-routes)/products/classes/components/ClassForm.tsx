'use client';

import { ProductClassDto, StatusEnum } from '@data-access/index';

interface ClassFormProps {
  isCreateMode: boolean;
  selectedClass: ProductClassDto | null;
  successMessage: string | null;
  onSave: (productClass: ProductClassDto) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function ClassForm({
  isCreateMode,
  selectedClass,
  successMessage,
  onSave,
  onDelete,
  onCancel
}: ClassFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const className = formData.get('productClassName') as string;
    
    if (isCreateMode) {
      const newClass = {
        productClassName: className,
        status: StatusEnum.ACTIVE // Default status for new classes
      };
      onSave(newClass as ProductClassDto);
    } else {
      const updatedClass = {
        ...selectedClass,
        productClassName: className,
        status: StatusEnum.ACTIVE
      };
      onSave(updatedClass as ProductClassDto);
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
      {!isCreateMode && selectedClass && 
       (selectedClass.status === StatusEnum.FOR_APPROVAL || selectedClass.status === StatusEnum.NEW_RECORD || selectedClass.status === StatusEnum.FOR_DELETION) && (
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
            {selectedClass.status === StatusEnum.FOR_DELETION 
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
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
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
            Class Name
          </label>
          <input
            type="text"
            name="productClassName"
            defaultValue={isCreateMode ? '' : selectedClass?.productClassName || ''}
            placeholder={isCreateMode ? 'Enter class name' : ''}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: 'white',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
            required
          />
        </div>
        
        {!isCreateMode && selectedClass && (
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
              {selectedClass.status || 'ACTIVE'}
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
            disabled={selectedClass?.status !== StatusEnum.ACTIVE}
            style={{
              padding: '10px 20px',
              backgroundColor: selectedClass?.status !== StatusEnum.ACTIVE ? 'transparent' : '#dc2626',
              color: selectedClass?.status !== StatusEnum.ACTIVE ? '#9ca3af' : 'white',
              border: selectedClass?.status !== StatusEnum.ACTIVE ? '1px solid #d1d5db' : 'none',
              borderRadius: '6px',
              cursor: selectedClass?.status !== StatusEnum.ACTIVE ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: selectedClass?.status !== StatusEnum.ACTIVE ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (selectedClass?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#b91c1c';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedClass?.status === StatusEnum.ACTIVE) {
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
            disabled={!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE}
            style={{
              padding: '10px 20px',
              backgroundColor: (!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE) ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: (!isCreateMode && selectedClass?.status !== StatusEnum.ACTIVE) ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (isCreateMode || selectedClass?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (isCreateMode || selectedClass?.status === StatusEnum.ACTIVE) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {isCreateMode ? 'Create Class' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
