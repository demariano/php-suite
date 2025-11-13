'use client';

interface ActivityLogsTabProps {
  activityLogs: string[];
}

export default function ActivityLogsTab({ activityLogs }: ActivityLogsTabProps) {
  if (!activityLogs || activityLogs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <div className="mb-4 text-5xl text-gray-400">📋</div>
        <h3 className="mb-2 text-lg font-semibold text-gray-700">No Activity Logs</h3>
        <p className="text-sm text-gray-500">
          There are no activity logs recorded for this return good sold record yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h3 className="mb-3 text-base font-semibold text-gray-800">
          Recent Activity
        </h3>
        {activityLogs && activityLogs.length > 0 ? (
          <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
            {activityLogs.map((log, index) => (
              <div 
                key={index} 
                className={`py-2 ${
                  index < activityLogs.length - 1 ? 'border-b border-gray-200' : ''
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        ) : (
          <p className="italic text-gray-500">
            No activity logs available
          </p>
        )}
      </div>
    </div>
  );
}

