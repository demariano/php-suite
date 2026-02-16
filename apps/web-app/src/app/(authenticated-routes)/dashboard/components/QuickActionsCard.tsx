import { Card, Typography } from '@components-web';
import { useRouter } from 'next/navigation';

export default function QuickActionsCard() {
    const router = useRouter();

    const primaryBtnClass =
        'flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-sm bg-secondaryBlue-500 text-white hover:bg-secondaryBlue-600 transition-colors';
    const secondaryBtnClass =
        'px-4 py-2 text-sm font-bold rounded-sm border border-secondaryBlue-500 text-secondaryBlue-500 hover:bg-secondaryBlue-50 transition-colors';

    return (
        <Card className="px-6 py-4">
            <div className="flex items-center justify-between">
                <div>
                    <Typography variant="h5">Quick Actions</Typography>
                    <p className="text-sm text-secondaryNeutral-400">Common tasks</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className={primaryBtnClass} onClick={() => router.push('/customers/customer/create')}>
                        <svg
                            width={14}
                            height={14}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                        >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Customer
                    </button>
                    <button className={secondaryBtnClass} onClick={() => router.push('/invoicing/invoice/create')}>
                        Create Invoice
                    </button>
                    <button className={secondaryBtnClass} onClick={() => router.push('/invoicing/payment/create')}>
                        Record Payment
                    </button>
                    <button className={secondaryBtnClass} onClick={() => router.push('/invoicing/contract/create')}>
                        New Contract
                    </button>
                </div>
            </div>
        </Card>
    );
}
