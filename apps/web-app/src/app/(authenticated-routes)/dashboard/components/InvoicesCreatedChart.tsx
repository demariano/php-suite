import { BarChart, Card, ErrorLoadingData, NoAvailableData, Typography } from '@components-web';
import { WeeklyInvoiceCreatedData } from '@data-access/index';

interface InvoicesCreatedChartProps {
    data: WeeklyInvoiceCreatedData[];
    totalInvoices: number;
    isLoading: boolean;
    error: string | null;
}

export default function InvoicesCreatedChart({ data, totalInvoices, isLoading, error }: InvoicesCreatedChartProps) {
    const chartData = data.map((item) => ({
        name: item.name,
        contractSales: item.contractSales,
        nonContractSales: item.nonContractSales,
    }));

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <Typography variant="h5">Invoices Created</Typography>
                    <p className="text-sm text-secondaryNeutral-400">By sales type over time</p>
                </div>
                {!isLoading && !error && (
                    <div className="text-right">
                        <p className="text-2xl font-bold text-secondaryNeutral-900">{totalInvoices.toLocaleString()}</p>
                        <p className="text-xs text-secondaryNeutral-400">Total Invoices</p>
                    </div>
                )}
            </div>
            {error ? (
                <ErrorLoadingData />
            ) : data.length === 0 && !isLoading ? (
                <NoAvailableData title="No Data" message="No invoices found for the selected date range." />
            ) : (
                <BarChart
                    data={chartData}
                    dataKeys={[
                        {
                            key: 'contractSales',
                            name: 'Contract Sales',
                            color: '#165CE9',
                        },
                        {
                            key: 'nonContractSales',
                            name: 'Non-Contract Sales',
                            color: '#7C3AED',
                        },
                    ]}
                    height={300}
                    isLoading={isLoading}
                    isFilterable
                />
            )}
        </Card>
    );
}
