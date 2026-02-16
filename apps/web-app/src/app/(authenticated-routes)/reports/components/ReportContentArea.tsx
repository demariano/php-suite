'use client';

import { ConfirmationModal } from '@components-web';
import { ReportApi } from '@data-access';
import { ReportDto, ReportFilterParams, ReportStatusEnum } from '@data-access/types/report.types';
import { useCallback, useEffect, useState } from 'react';
import { ReportConfig } from '../config/reportRegistry';
import GenerateReportModal from './GenerateReportModal';
import ReportFilters from './ReportFilters';

interface ReportContentAreaProps {
    report: ReportConfig;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    [ReportStatusEnum.READY]: { bg: 'bg-green-50', text: 'text-green-700', label: 'Ready' },
    [ReportStatusEnum.IN_PROGRESS]: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'In Progress' },
    [ReportStatusEnum.FAILED]: { bg: 'bg-red-50', text: 'text-red-700', label: 'Failed' },
};

const ReportContentArea = ({ report }: ReportContentAreaProps) => {
    const [generatedReports, setGeneratedReports] = useState<ReportDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [currentFilters, setCurrentFilters] = useState<ReportFilterParams>({});
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<ReportDto | null>(null);

    const fetchGeneratedReports = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await ReportApi.getReportsByType(report.reportType, 20);
            setGeneratedReports(response?.data || []);
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setIsLoading(false);
        }
    }, [report.reportType]);

    useEffect(() => {
        fetchGeneratedReports();
    }, [fetchGeneratedReports]);

    const handleGenerateReport = () => {
        setShowModal(true);
    };

    const handleConfirmGenerate = async (reportName: string) => {
        setIsGenerating(true);
        try {
            await ReportApi.createReport({
                reportName,
                reportFilename: `${reportName.replace(/[^a-zA-Z0-9-_]/g, '_')}.xlsx`,
                reportType: report.reportType,
                status: ReportStatusEnum.IN_PROGRESS,
                filters: currentFilters,
                dateRange:
                    currentFilters.startDate && currentFilters.endDate
                        ? `${currentFilters.startDate} - ${currentFilters.endDate}`
                        : undefined,
            });
            setShowModal(false);
            // Refresh the list
            await fetchGeneratedReports();
        } catch (error) {
            console.error('Failed to create report:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async (reportDto: ReportDto) => {
        if (!reportDto.reportId) return;
        setDownloadingId(reportDto.reportId);
        try {
            const response = await ReportApi.getDownloadUrl(reportDto.reportId);
            if (response?.data) {
                window.open(response.data, '_blank');
            }
        } catch (error) {
            console.error('Failed to get download URL:', error);
        } finally {
            setDownloadingId(null);
        }
    };

    const handleView = async (reportDto: ReportDto) => {
        if (!reportDto.reportId) return;
        try {
            const response = await ReportApi.getDownloadUrl(reportDto.reportId);
            if (response?.data) {
                const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
                    response.data
                )}&embedded=false`;
                window.open(viewerUrl, '_blank');
            }
        } catch (error) {
            console.error('Failed to get view URL:', error);
        }
    };

    const handleDelete = (reportDto: ReportDto) => {
        if (!reportDto.reportId) return;
        setReportToDelete(reportDto);
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        if (!reportToDelete?.reportId) return;
        try {
            await ReportApi.deleteReport(reportToDelete.reportId);
            await fetchGeneratedReports();
        } catch (error) {
            console.error('Failed to delete report:', error);
        } finally {
            setShowDeleteConfirm(false);
            setReportToDelete(null);
        }
    };

    const handleFiltersChange = (filters: ReportFilterParams) => {
        setCurrentFilters(filters);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="pl-6 h-full">
            {/* Report Header */}
            <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-900">{report.title}</h1>
                <p className="text-sm text-gray-500">{report.description}</p>
            </div>

            {/* Filters */}
            <ReportFilters
                reportId={report.id}
                filterType={report.filterType}
                supportsSeparateByArea={report.supportsSeparateByArea}
                separateByAreaDefault={report.separateByAreaDefault}
                supportsMultiArea={report.supportsMultiArea}
                onGenerateReport={handleGenerateReport}
                onFiltersChange={handleFiltersChange}
            />

            {/* Generated Reports List */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Generated Reports</h3>
                    <button
                        onClick={fetchGeneratedReports}
                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                {isLoading ? (
                    <div className="px-5 py-12 text-center text-sm text-gray-400">Loading reports...</div>
                ) : generatedReports.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                        <p className="text-sm text-gray-400 mb-1">No reports generated yet</p>
                        <p className="text-xs text-gray-300">
                            Set your filters and click &quot;Generate Report&quot; to create one
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {generatedReports.map((r) => {
                            const status = STATUS_STYLES[r.status || ''] || STATUS_STYLES[ReportStatusEnum.IN_PROGRESS];
                            const isReady = r.status === ReportStatusEnum.READY;
                            const isDownloading = downloadingId === r.reportId;

                            return (
                                <div
                                    key={r.reportId}
                                    className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                                >
                                    {/* Report info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {r.reportName || r.reportFilename}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {formatDate(r.dateCreated)}
                                            {r.dateRange ? ` | ${r.dateRange}` : ''}
                                            {r.createdBy ? ` | by ${r.createdBy}` : ''}
                                        </p>
                                        {r.status === ReportStatusEnum.FAILED && (
                                            <p
                                                className="text-xs text-red-600 mt-1 truncate"
                                                title={r.errorMessage || 'Report generation failed'}
                                            >
                                                {r.errorMessage || 'Report generation failed'}
                                            </p>
                                        )}
                                    </div>

                                    {/* Status badge */}
                                    <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}
                                    >
                                        {status.label}
                                    </span>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {isReady && (
                                            <>
                                                <button
                                                    onClick={() => handleDownload(r)}
                                                    disabled={isDownloading}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                                                >
                                                    <svg
                                                        width="14"
                                                        height="14"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                        <polyline points="7 10 12 15 17 10" />
                                                        <line x1="12" y1="15" x2="12" y2="3" />
                                                    </svg>
                                                    {isDownloading ? 'Loading...' : 'Download'}
                                                </button>
                                                <button
                                                    onClick={() => handleView(r)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                                >
                                                    <svg
                                                        width="14"
                                                        height="14"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                        <circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                    View
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleDelete(r)}
                                            className="inline-flex items-center px-2 py-1.5 text-xs text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                            title="Delete report"
                                        >
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Generate Report Modal */}
            <GenerateReportModal
                isOpen={showModal}
                reportTitle={report.title}
                filters={currentFilters}
                onConfirm={handleConfirmGenerate}
                onCancel={() => setShowModal(false)}
                isLoading={isGenerating}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal<ReportDto>
                show={showDeleteConfirm}
                record={reportToDelete}
                variant="delete"
                customTitle="Delete Report"
                customMessage="Are you sure you want to delete this report? This action cannot be undone."
                recordDisplayName={reportToDelete?.reportName || reportToDelete?.reportFilename}
                onConfirm={handleDeleteConfirm}
                onCancel={() => {
                    setShowDeleteConfirm(false);
                    setReportToDelete(null);
                }}
            />
        </div>
    );
};

export default ReportContentArea;
