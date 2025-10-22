'use client';

interface ContractChangeConfirmationModalProps {
  show: boolean;
  itemCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ContractChangeConfirmationModal({
  show,
  itemCount,
  onConfirm,
  onCancel
}: ContractChangeConfirmationModalProps) {
  if (!show) return null;

  return (
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#fef3c7',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '16px'
          }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
          </div>
          <div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0,
              marginBottom: '4px'
            }}>
              Contract Change Warning
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              Changing the contract will affect existing invoice items
            </p>
          </div>
        </div>

        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <p style={{
            fontSize: '14px',
            color: '#92400e',
            margin: 0,
            lineHeight: '1.5'
          }}>
            <strong>This action will:</strong>
          </p>
          <ul style={{
            fontSize: '14px',
            color: '#92400e',
            margin: '8px 0 0 0',
            paddingLeft: '20px',
            lineHeight: '1.5'
          }}>
            <li>Clear all {itemCount} existing invoice item{itemCount !== 1 ? 's' : ''}</li>
            <li>Restore stock quantities for all items</li>
            <li>Reset invoice amounts to zero</li>
            <li>Require you to re-add items with the new contract's deal settings</li>
          </ul>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b91c1c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }}
          >
            Continue & Clear Items
          </button>
        </div>
      </div>
    </div>
  );
}
