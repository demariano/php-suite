'use client';

interface SelectionFieldProps {
  label: string;
  selectedItem: { id: string; name: string } | null;
  onSelect: () => void;
  onClear: () => void;
  buttonText: string;
  disabled?: boolean;
}

export default function SelectionField({
  label,
  selectedItem,
  onSelect,
  onClear,
  buttonText,
  disabled = false
}: SelectionFieldProps) {
  // Check if label indicates required field (has asterisk)
  const isRequired = label.includes('*');
  // Remove asterisk from label text to avoid duplication
  const labelText = label.replace(/\*+$/, '').trim();
  
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px'
      }}>
        {labelText}
        {isRequired && (
          <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>
        )}
      </label>
      
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={selectedItem?.name || ''}
          readOnly
          onClick={disabled ? undefined : onSelect}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '12px 16px',
            paddingRight: selectedItem ? '40px' : '16px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: disabled ? '#f9fafb' : '#f9fafb',
            color: selectedItem ? '#1f2937' : '#6b7280',
            cursor: disabled ? 'not-allowed' : 'pointer',
            outline: 'none',
            transition: 'all 0.2s ease'
          }}
          placeholder={disabled ? "Please select an area first" : `Click to select ${labelText.toLowerCase()}`}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        
        {selectedItem && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
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
            title="Clear selection"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
