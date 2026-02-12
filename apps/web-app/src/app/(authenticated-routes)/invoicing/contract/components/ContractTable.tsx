'use client';

import { EmptyTableState, PageSizeSelector, PaginationButtons, TableSkeleton } from '@components-web';
import { ContractDto } from '@data-access/index';
import { ReactNode } from 'react';

type ContractTableRow = Omit<ContractDto, 'status'> & {
    status: ReactNode;
    latestActivity: { text: string; style: { bgColor: string; textColor: string } } | null;
};

interface ContractTableProps {
    isLoading: boolean;
    tableData: ContractTableRow[];
    headers: { key: string; label: string }[];
    searchQuery: string;
    onRowClick: (row: any) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    prevCursor: string | undefined;
    nextCursor: string | undefined;
    onPrevious: () => void;
    onNext: () => void;
}

export default function ContractTable({
    isLoading,
    tableData,
    headers,
    searchQuery,
    onRowClick,
    pageSize,
    onPageSizeChange,
    prevCursor,
    nextCursor,
    onPrevious,
    onNext,
}: ContractTableProps) {
    return (
        <>
            {/* Desktop Table */}
            {isLoading ? (
                <div className="hidden sm:block">
                    <TableSkeleton rows={pageSize} columns={headers.length} />
                </div>
            ) : (
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
                                    tableData.map((contract) => (
                                        <tr
                                            key={contract.contractId}
                                            onClick={() => onRowClick(contract)}
                                            className="cursor-pointer bg-white transition-all duration-200 hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-5 text-sm font-medium text-gray-900">
                                                {contract.contractNo || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {contract.contractName || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {contract.customerName || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {contract.startDate
                                                    ? new Date(contract.startDate).toLocaleDateString()
                                                    : '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-600">
                                                {contract.endDate
                                                    ? new Date(contract.endDate).toLocaleDateString()
                                                    : '-'}
                                            </td>
                                            <td className="px-6 py-5">{contract.status}</td>
                                            <td className="px-6 py-5 text-sm">
                                                {contract.latestActivity ? (
                                                    <span
                                                        className={`px-2 py-1 rounded ${contract.latestActivity.style.bgColor} ${contract.latestActivity.style.textColor}`}
                                                        title={contract.latestActivity.text}
                                                    >
                                                        {contract.latestActivity.text.length > 50
                                                            ? `${contract.latestActivity.text.substring(0, 50)}...`
                                                            : contract.latestActivity.text}
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
                                                        ? `No contracts found matching "${searchQuery}"`
                                                        : 'No contracts found'
                                                }
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Desktop Pagination */}
            <div className="hidden sm:flex mt-6 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-200 rounded-xl px-4 py-4 sm:px-6 shadow-sm">
                <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
                <PaginationButtons
                    onPrevious={onPrevious}
                    onNext={onNext}
                    hasPrevious={!!prevCursor}
                    hasNext={!!nextCursor}
                />
            </div>

            {/* Mobile Cards */}
            {isLoading ? (
                <div className="sm:hidden">
                    <TableSkeleton rows={pageSize} columns={1} />
                </div>
            ) : (
                <div className="sm:hidden space-y-4">
                    {tableData.length > 0 ? (
                        tableData.map((contract) => (
                            <button
                                key={contract.contractId}
                                type="button"
                                onClick={() => onRowClick(contract)}
                                className="w-full bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2 text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900">{contract.contractNo || '-'}</h3>
                                    {contract.status}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <div>Name: {contract.contractName || '-'}</div>
                                    <div>Customer: {contract.customerName || '-'}</div>
                                    <div>
                                        Start Date:{' '}
                                        {contract.startDate ? new Date(contract.startDate).toLocaleDateString() : '-'}
                                    </div>
                                    <div>
                                        End Date:{' '}
                                        {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : '-'}
                                    </div>
                                </div>
                                {contract.latestActivity && (
                                    <div className="mt-2">
                                        <span className="text-xs font-medium text-gray-500">Latest Activity: </span>
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${contract.latestActivity.style.bgColor} ${contract.latestActivity.style.textColor}`}
                                        >
                                            {contract.latestActivity.text.length > 60
                                                ? `${contract.latestActivity.text.substring(0, 60)}...`
                                                : contract.latestActivity.text}
                                        </span>
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl p-8">
                            <EmptyTableState
                                message={
                                    searchQuery ? `No contracts found matching "${searchQuery}"` : 'No contracts found'
                                }
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Pagination */}
            {!isLoading && (
                <div className="sm:hidden flex flex-col gap-3 bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm">
                    <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
                    <PaginationButtons
                        onPrevious={onPrevious}
                        onNext={onNext}
                        hasPrevious={!!prevCursor}
                        hasNext={!!nextCursor}
                    />
                </div>
            )}
        </>
    );
}
