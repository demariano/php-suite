import { BarChart, Card, ErrorLoadingData, NoAvailableData, Typography } from '@components-web';
import { WeeklyPaymentStatusData } from '@data-access/index';

interface InvoicePaymentStatusChartProps {
    data: WeeklyPaymentStatusData[];
    isLoading: boolean;
    error: string | null;
}

export default function InvoicePaymentStatusChart({ data, isLoading, error }: InvoicePaymentStatusChartProps) {
    const chartData = data.map((item) => ({
        name: item.name,
        paid: item.paid,
        overpaid: item.overpaid,
        partial: item.partial,
        unpaid: item.unpaid,
    }));

    return (
        <Card className="p-6">
            <div className="mb-2">
                <Typography variant="h5">Invoice Payment Status</Typography>
                <p className="text-sm text-secondaryNeutral-400">Payment status distribution</p>
            </div>
            {error ? (
                <ErrorLoadingData />
            ) : data.length === 0 && !isLoading ? (
                <NoAvailableData title="No Data" message="No payment status data for the selected date range." />
            ) : (
                <BarChart
                    data={chartData}
                    dataKeys={[
                        {
                            key: 'paid',
                            name: 'Paid',
                            color: '#50B049',
                        },
                        {
                            key: 'overpaid',
                            name: 'Overpaid',
                            color: '#165CE9',
                        },
                        {
                            key: 'partial',
                            name: 'Partial',
                            color: '#FDAB4E',
                        },
                        {
                            key: 'unpaid',
                            name: 'Unpaid',
                            color: '#EE2C59',
                        },
                    ]}
                    height={300}
                    isLoading={isLoading}
                    isStackedBar
                    isFilterable
                />
            )}
        </Card>
    );
}
