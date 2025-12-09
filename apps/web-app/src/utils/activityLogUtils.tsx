/**
 * Utility functions for parsing and styling activity logs
 */


export interface ParsedActivityLog {
  date: string;
  activity: string;
}

export interface ActivityStyle {
  bgColor: string;
  textColor: string;
}

/**
 * Parses an activity log entry to extract date and activity
 * Format: "Date: [date], [time], [activity message]"
 * Example: "Date: 12/10/2025, 1:14:47 AM, Terms updated by admin@old.st for approval"
 */
export const parseActivityLog = (log: string): ParsedActivityLog => {
  // Format: "Date: [date], [time], [activity message]"
  // The toLocaleString format includes date and time separated by comma and space
  const dateTimeMatch = log.match(/^Date:\s*([^,]+,\s*[^,]+),\s*(.+)$/);
  if (dateTimeMatch) {
    // Format has date+time (first two parts) and activity
    return {
      date: dateTimeMatch[1].trim(),
      activity: dateTimeMatch[2].trim()
    };
  }
  // Try format without time: "Date: [date], [activity message]"
  const dateMatch = log.match(/^Date:\s*(.+?),\s*(.+)$/);
  if (dateMatch) {
    return {
      date: dateMatch[1].trim(),
      activity: dateMatch[2].trim()
    };
  }
  // Fallback if format doesn't match
  return {
    date: '',
    activity: log
  };
};

/**
 * Gets the appropriate background and text colors based on activity type
 */
export const getActivityStyle = (activity: string): ActivityStyle => {
  const activityLower = activity.toLowerCase();
  
  if (activityLower.includes('denied') || activityLower.includes('deny')) {
    return {
      bgColor: 'bg-red-50',
      textColor: 'text-red-900'
    };
  }
  
  if (activityLower.includes('approved') || activityLower.includes('approve')) {
    return {
      bgColor: 'bg-green-50',
      textColor: 'text-green-900'
    };
  }
  
  if (activityLower.includes('updated') || activityLower.includes('update')) {
    return {
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-900'
    };
  }
  
  if (activityLower.includes('created') || activityLower.includes('create')) {
    return {
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-900'
    };
  }
  
  if (activityLower.includes('deleted') || activityLower.includes('delete')) {
    return {
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-900'
    };
  }
  
  // Default style
  return {
    bgColor: 'bg-white',
    textColor: 'text-gray-700'
  };
};

/**
 * Renders activity logs in a table format with color coding
 */
export const renderActivityLogsTable = (
  activityLogs: string[] | undefined,
  emptyMessage = 'No activity logs available'
): JSX.Element => {
  if (!activityLogs || activityLogs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm italic text-gray-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
              Activity
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {activityLogs.map((log, index) => {
            const parsed = parseActivityLog(log);
            const activityStyle = getActivityStyle(parsed.activity);
            return (
              <tr key={index} className={`${activityStyle.bgColor} hover:opacity-80 transition-opacity`}>
                <td className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activityStyle.textColor}`}>
                  {parsed.date || '-'}
                </td>
                <td className={`px-4 py-3 text-sm ${activityStyle.textColor}`}>
                  {parsed.activity}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

