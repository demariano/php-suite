import cn from 'classnames';
import IIcon from '../../types/icons';
import Card from './card';

export interface StatCardProps {
    label: string;
    value: number | string;
    icon?: React.ElementType<IIcon>;
    iconBgColor?: string;
    isLoading?: boolean;
    className?: string;
}

export function StatCard({
    label,
    value,
    icon: Icon,
    iconBgColor = '#E8F0FE',
    isLoading = false,
    className,
}: StatCardProps) {
    const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;

    return (
        <Card className={cn('p-5', className)}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-secondaryNeutral-500 font-medium">{label}</p>
                    {isLoading ? (
                        <div className="h-9 w-24 animate-shimmer rounded mt-1" />
                    ) : (
                        <p className="text-3xl font-bold text-secondaryNeutral-900 mt-1">{formattedValue}</p>
                    )}
                </div>
                {Icon && (
                    <div
                        className="flex items-center justify-center w-11 h-11 rounded-lg"
                        style={{ backgroundColor: iconBgColor }}
                    >
                        <Icon size={22} />
                    </div>
                )}
            </div>
        </Card>
    );
}

export default StatCard;
