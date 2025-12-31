'use client';

import { renderActivityLogsTable } from '@web-app/utils/activityLogUtils';

interface Activity {
  timestamp: string;
  activity: string;
}

interface LogsTabProps {
  activities: Activity[];
}

export function LogsTab({ activities }: LogsTabProps) {
  // Convert activities back to string format expected by renderActivityLogsTable
  const activityLogs = activities.map(a => `Date: ${a.timestamp}, ${a.activity}`);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2 text-white shadow-sm">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="m-0 text-base font-bold text-blue-600">
            Activity Logs
          </h3>
        </div>

        {renderActivityLogsTable(activityLogs)}
      </div>
    </div>
  );
}
