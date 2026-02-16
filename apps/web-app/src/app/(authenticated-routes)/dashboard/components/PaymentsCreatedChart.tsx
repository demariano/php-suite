import { BarChart, Card, ErrorLoadingData, NoAvailableData, Typography } from '@components-web';
import { WeeklyPaymentAmountData } from '@data-access/index';

interface PaymentsCreatedChartProps {
    data: WeeklyPaymentAmountData[];
    isLoading: boolean;
    error: string | null;
}

export default function PaymentsCreatedChart({ data, isLoading, error }: PaymentsCreatedChartProps) {
    const chartData = data.map((item) => ({
        name: item.name,
        amount: item.amount,
    }));

    const formatCurrency = (tick: string) => {
        const num = Number(tick);
        if (num >= 1000) {
            return `${(num / 1000).toFixed(0)}k`;
        }
        return tick;
    };

    return (
        <Card className="p-6">
            <div className="mb-2">
                <Typography variant="h5">Payments Created</Typography>
                <p className="text-sm text-secondaryNeutral-400">Payment amounts over time</p>
            </div>
            {error ? (
                <ErrorLoadingData />
            ) : data.length === 0 && !isLoading ? (
                <NoAvailableData title="No Data" message="No payments found for the selected date range." />
            ) : (
                <BarChart
                    data={chartData}
                    dataKeys={[
                        {
                            key: 'amount',
                            name: 'Amount (₱)',
                            color: '#50B049',
                        },
                    ]}
                    height={300}
                    isLoading={isLoading}
                    yTickFormatter={formatCurrency}
                    unit="₱"
                    isUnitPrefix
                />
            )}
        </Card>
    );
}
