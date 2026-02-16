import { BarChart, Card, ErrorLoadingData, NoAvailableData, Typography } from '@components-web';
import { WeeklyRGSCountData } from '@data-access/index';

interface ReturnGoodsSoldChartProps {
    data: WeeklyRGSCountData[];
    totalReturns: number;
    isLoading: boolean;
    error: string | null;
}

export default function ReturnGoodsSoldChart({ data, totalReturns, isLoading, error }: ReturnGoodsSoldChartProps) {
    const chartData = data.map((item) => ({
        name: item.name,
        count: item.count,
    }));

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <Typography variant="h5">Return Goods Sold</Typography>
                    <p className="text-sm text-secondaryNeutral-400">RGS count over time</p>
                </div>
                {!isLoading && !error && (
                    <div className="text-right">
                        <p className="text-2xl font-bold text-secondaryNeutral-900">{totalReturns.toLocaleString()}</p>
                        <p className="text-xs text-secondaryNeutral-400">Total Returns</p>
                    </div>
                )}
            </div>
            {error ? (
                <ErrorLoadingData />
            ) : data.length === 0 && !isLoading ? (
                <NoAvailableData title="No Data" message="No return goods sold for the selected date range." />
            ) : (
                <BarChart
                    data={chartData}
                    dataKeys={[
                        {
                            key: 'count',
                            name: 'RGS Count',
                            color: '#EE2C59',
                        },
                    ]}
                    height={300}
                    isLoading={isLoading}
                />
            )}
        </Card>
    );
}
