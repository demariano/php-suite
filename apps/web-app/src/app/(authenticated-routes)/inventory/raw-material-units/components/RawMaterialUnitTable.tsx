import { EmptyTableState, PageSizeSelector, PaginationButtons, StatusBadge, TableSkeleton } from '@components-web';
import { RawMaterialUnitDto } from '@data-access/index';
import { getActivityStyle, parseActivityLog } from '@web-app/utils/activityLogUtils';
import { useMemo } from 'react';

interface RawMaterialUnitTableProps {
    rawMaterialUnits: RawMaterialUnitDto[];
    searchQuery: string;
    isLoading: boolean;
    onRowClick: (rawMaterialUnitId: string) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    nextCursor: string | undefined;
    prevCursor: string | undefined;
    onNextPage: () => void;
    onPrevPage: () => void;
}

export function RawMaterialUnitTable({
    rawMaterialUnits,
    searchQuery,
    isLoading,
    onRowClick,
    pageSize,
    onPageSizeChange,
    nextCursor,
    prevCursor,
    onNextPage,
    onPrevPage,
}: RawMaterialUnitTableProps) {
    const headers = useMemo(
        () => [
            { key: 'name', label: 'NAME' },
            { key: 'status', label: 'STATUS' },
            { key: 'latestActivity', label: 'LATEST ACTIVITY' },
        ],
        []
    );

    const tableData = useMemo(
        () =>
            rawMaterialUnits.map((unit) => {
                const latestLog = unit.activityLogs?.[unit.activityLogs.length - 1];
                const parsed = latestLog ? parseActivityLog(latestLog) : null;
                const activityStyle = parsed ? getActivityStyle(parsed.activity) : undefined;

                return {
                    rawMaterialUnitId: unit.rawMaterialUnitId,
                    rawMaterialUnitName: unit.rawMaterialUnitName,
                    status: unit.status,
                    latestActivity: parsed && activityStyle ? { text: parsed.activity, style: activityStyle } : null,
                };
            }),
        [rawMaterialUnits]
    );

    if (isLoading) {
        return <TableSkeleton columns={3} />;
    }

    return (
        <>
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="border-b border-blue-700 bg-blue-600">
                            <tr>
                                {headers.map((header) => (
                                    <th
                                        key={header.key}
                                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white"
                                    >
                                        {header.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {tableData.length > 0 ? (
                                tableData.map((record) => (
                                    <tr
                                        key={record.rawMaterialUnitId}
                                        onClick={() => onRowClick(record.rawMaterialUnitId)}
                                        className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                            {record.rawMaterialUnitName || '-'}
                                        </td>
                                        <td className="px-6 py-5">
                                            <StatusBadge status={record.status} />
                                        </td>
                                        <td className="px-6 py-5 text-sm">
                                            {record.latestActivity ? (
                                                <span
                                                    className={`px-2 py-1 rounded ${record.latestActivity.style.bgColor} ${record.latestActivity.style.textColor}`}
                                                    title={record.latestActivity.text}
                                                >
                                                    {record.latestActivity.text.length > 50
                                                        ? `${record.latestActivity.text.substring(0, 50)}...`
                                                        : record.latestActivity.text}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={headers.length}>
                                        <EmptyTableState
                                            message={
                                                searchQuery
                                                    ? `No records found matching "${searchQuery}"`
                                                    : 'No records found'
                                            }
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="space-y-4 sm:hidden">
                {tableData.length > 0 ? (
                    tableData.map((record) => (
                        <button
                            key={record.rawMaterialUnitId}
                            type="button"
                            onClick={() => onRowClick(record.rawMaterialUnitId)}
                            className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900">
                                        {record.rawMaterialUnitName || '-'}
                                    </h3>
                                </div>
                                <StatusBadge status={record.status} />
                            </div>
                            {record.latestActivity && (
                                <div className="mt-2">
                                    <dt className="font-medium text-gray-500 mb-1">Latest Activity</dt>
                                    <dd>
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${record.latestActivity.style.bgColor} ${record.latestActivity.style.textColor}`}
                                        >
                                            {record.latestActivity.text.length > 60
                                                ? `${record.latestActivity.text.substring(0, 60)}...`
                                                : record.latestActivity.text}
                                        </span>
                                    </dd>
                                </div>
                            )}
                        </button>
                    ))
                ) : (
                    <EmptyTableState
                        message={searchQuery ? `No records found matching "${searchQuery}"` : 'No records found'}
                    />
                )}
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
                <PaginationButtons
                    onPrevious={onPrevPage}
                    onNext={onNextPage}
                    hasPrevious={!!prevCursor}
                    hasNext={!!nextCursor}
                />
            </div>
        </>
    );
}
