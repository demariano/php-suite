'use client';

interface Activity {
  timestamp: string;
  activity: string;
}

interface LogsTabProps {
  activities: Activity[];
}

export function LogsTab({ activities }: LogsTabProps) {
  const getActivityColor = (activity: string): string => {
    if (activity.includes('created') || activity.includes('Created')) {
      return 'text-green-600';
    }
    if (activity.includes('updated') || activity.includes('Updated') || activity.includes('modified')) {
      return 'text-blue-600';
    }
    if (activity.includes('deleted') || activity.includes('Deleted') || activity.includes('removed')) {
      return 'text-red-600';
    }
    if (activity.includes('approved') || activity.includes('Approved')) {
      return 'text-green-600';
    }
    if (activity.includes('denied') || activity.includes('Denied')) {
      return 'text-red-600';
    }
    if (activity.includes('delivery') || activity.includes('Delivery')) {
      return 'text-purple-600';
    }
    return 'text-gray-700';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Activity Logs</h3>
      
      {activities.length === 0 ? (
        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-500">No activity logs available.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-blue-300"
            >
              <div className="flex items-start justify-between gap-4">
                <p className={`flex-1 text-sm font-medium ${getActivityColor(activity.activity)}`}>
                  {activity.activity}
                </p>
                <p className="text-xs text-gray-500 whitespace-nowrap">
                  {new Date(activity.timestamp).toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
