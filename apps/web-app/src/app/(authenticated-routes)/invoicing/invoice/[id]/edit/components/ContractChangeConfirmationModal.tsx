'use client';

interface ContractChangeConfirmationModalProps {
    show: boolean;
    itemCount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ContractChangeConfirmationModal({
    show,
    itemCount,
    onConfirm,
    onCancel,
}: ContractChangeConfirmationModalProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
            <div className="w-[90%] max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center">
                    <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <div>
                        <h3 className="m-0 mb-1 text-lg font-semibold text-gray-800">Contract Change Warning</h3>
                        <p className="m-0 text-sm text-gray-500">
                            Changing the contract will affect existing invoice items
                        </p>
                    </div>
                </div>

                <div className="mb-6 rounded-lg border border-amber-500 bg-amber-100 p-4">
                    <p className="m-0 text-sm font-bold leading-relaxed text-amber-800">This action will:</p>
                    <ul className="m-0 mt-2 list-disc pl-5 text-sm leading-relaxed text-amber-800">
                        <li>
                            Clear all {itemCount} existing invoice item{itemCount !== 1 ? 's' : ''}
                        </li>
                        <li>Restore stock quantities for all items</li>
                        <li>Reset invoice amounts to zero</li>
                        <li>Require you to re-add items with the new contract's deal settings</li>
                    </ul>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg border border-gray-300 bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
                    >
                        Continue & Clear Items
                    </button>
                </div>
            </div>
        </div>
    );
}
