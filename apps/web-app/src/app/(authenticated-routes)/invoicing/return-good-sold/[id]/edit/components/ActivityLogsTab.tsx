'use client';

interface ActivityLogsTabProps {
  activityLogs: string[];
}

export default function ActivityLogsTab({ activityLogs }: ActivityLogsTabProps) {
  if (!activityLogs || activityLogs.length === 0) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '48px',
        textAlign: 'center'
      }}>
        <div style={{
          color: '#9ca3af',
          fontSize: '48px',
          marginBottom: '16px'
        }}>📋</div>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>No Activity Logs</h3>
        <p style={{
          fontSize: '14px',
          color: '#6b7280'
        }}>
          There are no activity logs recorded for this return good sold record yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '12px'
        }}>
          Recent Activity
        </h3>
        {activityLogs && activityLogs.length > 0 ? (
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '16px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            maxHeight: '288px',
            overflowY: 'auto'
          }}>
            {activityLogs.map((log, index) => (
              <div 
                key={index} 
                style={{
                  padding: '8px 0',
                  borderBottom: index < activityLogs.length - 1 ? '1px solid #e5e7eb' : 'none'
                }}
              >
                {log}
              </div>
            ))}
          </div>
        ) : (
          <p style={{
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            No activity logs available
          </p>
        )}
      </div>
    </div>
  );
}

