'use client';

interface PriceTypeHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onCreateClick: () => void;
}

export default function PriceTypeHeader({
  searchTerm,
  onSearchChange,
  onRefresh,
  onCreateClick
}: PriceTypeHeaderProps) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h1 style={{
        fontSize: '32px',
        fontWeight: '700',
        marginBottom: '24px',
        color: '#1f2937'
      }}>
        Price Types
      </h1>

      {/* Search and Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexDirection: window.innerWidth < 640 ? 'column' : 'row',
        gap: '16px'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexDirection: window.innerWidth < 640 ? 'column' : 'row',
          width: window.innerWidth < 640 ? '100%' : 'auto'
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: window.innerWidth < 640 ? '100%' : '288px' }}>
            <input
              type="text"
              placeholder="Search by name"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            />
            <div style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6b7280'
            }}>
              🔍
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            style={{
              padding: '10px 16px',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              width: window.innerWidth < 640 ? '100%' : 'auto'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
            title="Refresh"
          >
            ↻
          </button>
        </div>

        {/* Add Price Type Button */}
        <button 
          onClick={onCreateClick}
          style={{
            padding: '10px 16px',
            backgroundColor: '#e5e7eb',
            color: '#1f2937',
            border: '2px solid #9ca3af',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            width: window.innerWidth < 640 ? '100%' : 'auto'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#d1d5db';
            e.currentTarget.style.borderColor = '#6b7280';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#e5e7eb';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
        >
          <span style={{ fontSize: '18px' }}>+</span>
          Add Price Type
        </button>
      </div>
    </div>
  );
}
