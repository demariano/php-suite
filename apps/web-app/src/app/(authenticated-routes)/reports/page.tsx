'use client';

import { useState } from 'react';
import ReportContentArea from './components/ReportContentArea';
import ReportList from './components/ReportList';
import ReportModuleList from './components/ReportModuleList';
import { REPORT_MODULES } from './config/reportRegistry';

export default function ReportsPage() {
    const [selectedModuleId, setSelectedModuleId] = useState(REPORT_MODULES[0].id);
    const [selectedReportId, setSelectedReportId] = useState(REPORT_MODULES[0].reports[0].id);

    const selectedModule = REPORT_MODULES.find((m) => m.id === selectedModuleId) ?? REPORT_MODULES[0];
    const selectedReport = selectedModule.reports.find((r) => r.id === selectedReportId) ?? selectedModule.reports[0];

    const handleModuleChange = (moduleId: string) => {
        setSelectedModuleId(moduleId);
        const mod = REPORT_MODULES.find((m) => m.id === moduleId);
        if (mod && mod.reports.length > 0) {
            setSelectedReportId(mod.reports[0].id);
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
            {/* Left panel — Module list */}
            <div className="w-[200px] flex-shrink-0 py-4 pl-4">
                <ReportModuleList
                    modules={REPORT_MODULES}
                    selectedModuleId={selectedModuleId}
                    onSelectModule={handleModuleChange}
                />
            </div>

            {/* Middle panel — Report list */}
            <div className="w-[280px] flex-shrink-0 py-4">
                <ReportList
                    module={selectedModule}
                    selectedReportId={selectedReportId}
                    onSelectReport={setSelectedReportId}
                />
            </div>

            {/* Right panel — Report content area */}
            <div className="flex-1 py-4 pr-4 overflow-y-auto">
                <ReportContentArea key={selectedReport.id} report={selectedReport} />
            </div>
        </div>
    );
}
