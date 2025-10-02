'use client';

interface SelectionFieldProps {
  label: string;
  selectedItem: {id: string, name: string} | null;
  onSelect: () => void;
  onClear: () => void;
  buttonText: string;
}

export default function SelectionField({
  label,
  selectedItem,
  onSelect,
  onClear,
  buttonText
}: SelectionFieldProps) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px'
      }}>
        {label}
        {label.includes('*') && (
          <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>
        )}
      </label>
      {selectedItem ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          border: '2px solid #d1d5db',
          borderRadius: '8px',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '500',
              color: '#1f2937'
            }}>
              {selectedItem.name}
            </div>
          </div>
          <button
            type="button"
            onClick={onSelect}
            style={{
              padding: '8px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '36px',
              height: '36px'
            }}
            title="Change selection"
          >
            🔍
          </button>
          <button
            type="button"
            onClick={onClear}
            style={{
              padding: '8px 12px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Clear
          </button>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          border: '2px dashed #d1d5db',
          borderRadius: '8px',
          backgroundColor: '#fafafa'
        }}>
          <div style={{ flex: 1, color: '#6b7280', fontSize: '14px' }}>
            No {label.toLowerCase()} selected
          </div>
          <button
            type="button"
            onClick={onSelect}
            style={{
              padding: '8px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '36px',
              height: '36px'
            }}
            title={buttonText}
          >
            🔍
          </button>
        </div>
      )}
    </div>
  );
}
