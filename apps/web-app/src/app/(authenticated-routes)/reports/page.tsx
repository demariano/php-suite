'use client';

import { useState } from 'react';
import ReportContentArea from './components/ReportContentArea';
import ReportList from './components/ReportList';
import ReportModuleList from './components/ReportModuleList';
import { REPORT_MODULES } from './config/reportRegistry';

export default function ReportsPage() {
    const [selectedModuleId, setSelectedModuleId] = useState(REPORT_MODULES[0].id);
    const [selectedReportId, setSelectedReportId] = useState(REPORT_MODULES[0].reports[0].id);
    // Mobile step: 0 = module list, 1 = report list, 2 = report content
    const [mobileStep, setMobileStep] = useState(0);

    const selectedModule = REPORT_MODULES.find((m) => m.id === selectedModuleId) ?? REPORT_MODULES[0];
    const selectedReport = selectedModule.reports.find((r) => r.id === selectedReportId) ?? selectedModule.reports[0];

    const handleModuleChange = (moduleId: string) => {
        setSelectedModuleId(moduleId);
        const mod = REPORT_MODULES.find((m) => m.id === moduleId);
        if (mod && mod.reports.length > 0) {
            setSelectedReportId(mod.reports[0].id);
        }
        setMobileStep(1);
    };

    const handleReportChange = (reportId: string) => {
        setSelectedReportId(reportId);
        setMobileStep(2);
    };

    return (
        <>
            {/* ── Mobile breadcrumb nav (hidden on md+) ── */}
            <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2 text-sm md:hidden">
                <button
                    onClick={() => setMobileStep(0)}
                    className={`font-medium ${
                        mobileStep === 0 ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Modules
                </button>
                {mobileStep >= 1 && (
                    <>
                        <span className="text-gray-300">/</span>
                        <button
                            onClick={() => setMobileStep(1)}
                            className={`font-medium ${
                                mobileStep === 1 ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {selectedModule.label}
                        </button>
                    </>
                )}
                {mobileStep >= 2 && (
                    <>
                        <span className="text-gray-300">/</span>
                        <span className="truncate font-medium text-blue-600">{selectedReport.title}</span>
                    </>
                )}
            </div>

            <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
                {/* Left panel — Module list */}
                {/* Desktop: always visible | Mobile: shown only on step 0 */}
                <div
                    className={`w-full flex-shrink-0 py-4 pl-4 md:block md:w-[200px] ${
                        mobileStep === 0 ? 'block' : 'hidden'
                    }`}
                >
                    <ReportModuleList
                        modules={REPORT_MODULES}
                        selectedModuleId={selectedModuleId}
                        onSelectModule={handleModuleChange}
                    />
                </div>

                {/* Middle panel — Report list */}
                {/* Desktop: always visible | Mobile: shown only on step 1 */}
                <div
                    className={`w-full flex-shrink-0 py-4 md:block md:w-[280px] ${
                        mobileStep === 1 ? 'block' : 'hidden'
                    }`}
                >
                    <ReportList
                        module={selectedModule}
                        selectedReportId={selectedReportId}
                        onSelectReport={handleReportChange}
                    />
                </div>

                {/* Right panel — Report content area */}
                {/* Desktop: always visible | Mobile: shown only on step 2 */}
                <div
                    className={`w-full flex-1 overflow-y-auto py-4 pr-4 md:block ${
                        mobileStep === 2 ? 'block' : 'hidden'
                    }`}
                >
                    <ReportContentArea key={selectedReport.id} report={selectedReport} />
                </div>
            </div>
        </>
    );
}
