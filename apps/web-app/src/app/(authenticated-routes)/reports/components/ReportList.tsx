'use client';

import { ReportConfig, ReportModuleConfig } from '../config/reportRegistry';

interface ReportListProps {
    module: ReportModuleConfig;
    selectedReportId: string;
    onSelectReport: (reportId: string) => void;
}

const ReportList = ({ module, selectedReportId, onSelectReport }: ReportListProps) => {
    return (
        <div className="border-r border-gray-200 h-full px-4">
            <h2 className="text-base font-bold text-gray-900 mb-0.5">{module.label} Reports</h2>
            <p className="text-xs text-gray-500 mb-4">
                {module.reports.length} available {module.reports.length === 1 ? 'report' : 'reports'}
            </p>

            <nav className="flex flex-col gap-1">
                {module.reports.map((report: ReportConfig) => {
                    const isActive = report.id === selectedReportId;
                    return (
                        <button
                            key={report.id}
                            onClick={() => onSelectReport(report.id)}
                            className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-lg text-left w-full transition-colors ${
                                isActive ? 'bg-blue-50 border-l-3 border-blue-600' : 'hover:bg-gray-50'
                            }`}
                        >
                            <span
                                className={`text-sm ${
                                    isActive ? 'font-semibold text-blue-700' : 'font-medium text-gray-900'
                                }`}
                            >
                                {report.title}
                            </span>
                            <span className={`text-xs ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                                {report.description}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default ReportList;
