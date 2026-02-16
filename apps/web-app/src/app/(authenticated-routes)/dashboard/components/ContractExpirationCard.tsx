import { Badge, Card, ErrorLoadingData, NoAvailableData, Typography } from '@components-web';
import { ContractExpirationItem } from '@data-access/index';
import cn from 'classnames';

interface ContractExpirationCardProps {
    contracts: ContractExpirationItem[];
    isLoading: boolean;
    error: string | null;
}

function getUrgencyBadge(urgency: ContractExpirationItem['urgency']) {
    switch (urgency) {
        case 'active':
            return (
                <Badge variant="success" size="sm">
                    Active
                </Badge>
            );
        case '30days':
            return (
                <Badge variant="warning" size="sm">
                    30 Days
                </Badge>
            );
        case 'expiring_soon':
            return (
                <Badge variant="danger" size="sm">
                    Expiring Soon
                </Badge>
            );
        default:
            return null;
    }
}

function getIconColor(urgency: ContractExpirationItem['urgency']) {
    switch (urgency) {
        case 'active':
            return 'text-secondaryNeutral-400';
        case '30days':
            return 'text-orange-500';
        case 'expiring_soon':
            return 'text-red-500';
        default:
            return 'text-secondaryNeutral-400';
    }
}

function getRowStyle(urgency: ContractExpirationItem['urgency']) {
    switch (urgency) {
        case '30days':
            return 'border-l-4 border-l-orange-400 bg-orange-50';
        case 'expiring_soon':
            return 'border-l-4 border-l-red-400 bg-red-50';
        default:
            return 'border border-secondaryNeutral-100';
    }
}

export default function ContractExpirationCard({ contracts, isLoading, error }: ContractExpirationCardProps) {
    return (
        <Card className="p-6">
            <div className="mb-4">
                <Typography variant="h5">Contract Expiration</Typography>
                <p className="text-sm text-secondaryNeutral-400">Upcoming contract renewals</p>
            </div>
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 animate-shimmer rounded-lg" />
                    ))}
                </div>
            ) : error ? (
                <ErrorLoadingData />
            ) : contracts.length === 0 ? (
                <NoAvailableData title="No Contracts" message="No contracts found matching the criteria." />
            ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {contracts.map((contract) => (
                        <div key={contract.contractId} className={cn('rounded-lg p-4', getRowStyle(contract.urgency))}>
                            <div className="flex items-start gap-3">
                                <div className={cn('mt-0.5', getIconColor(contract.urgency))}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm text-secondaryNeutral-900">
                                            {contract.contractName}
                                        </p>
                                        {getUrgencyBadge(contract.urgency)}
                                    </div>
                                    <p className="text-xs text-secondaryNeutral-500 mt-0.5">{contract.customerName}</p>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-xs text-secondaryNeutral-400">Ends: {contract.endDate}</p>
                                        <p className="text-xs text-secondaryNeutral-500 font-medium">
                                            {contract.daysLeft} days left
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
