'use client';

import { ReportModuleConfig } from '../config/reportRegistry';

interface ReportModuleListProps {
    modules: ReportModuleConfig[];
    selectedModuleId: string;
    onSelectModule: (moduleId: string) => void;
}

const ReportModuleList = ({ modules, selectedModuleId, onSelectModule }: ReportModuleListProps) => {
    return (
        <div className="border-r border-gray-200 h-full pr-2">
            <h2 className="text-base font-bold text-gray-900 mb-0.5">Report Modules</h2>
            <p className="text-xs text-gray-500 mb-4">Select a module to view reports</p>

            <nav className="flex flex-col gap-1">
                {modules.map((mod) => {
                    const isActive = mod.id === selectedModuleId;
                    const Icon = mod.icon;
                    return (
                        <button
                            key={mod.id}
                            onClick={() => onSelectModule(mod.id)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left w-full transition-colors ${
                                isActive
                                    ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-600'
                                    : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <Icon size={20} color={isActive ? '#2563EB' : '#6B7280'} />
                            <div className="flex flex-col min-w-0">
                                <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                    {mod.label}
                                </span>
                                <span className={`text-xs ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                                    {mod.reports.length} {mod.reports.length === 1 ? 'report' : 'reports'}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default ReportModuleList;
