'use client';

import { Close, Warning } from '@components-web';
import { RawMaterialsLocationDto, useSessionStore } from '@data-access/index';
import { Disclosure } from '@headlessui/react';
import { useState } from 'react';
import DatePicker from '../../../../../components/DatePicker';
import { RawMaterialsLocationSearchableSelectionModal } from '../../../../../search-modals';

interface OrderItem {
    rawMaterialId: string;
    rawMaterialName: string;
    rawMaterialUnitId: string;
    rawMaterialUnitName: string;
    qty: number;
}

interface DeliveredItem {
    rawMaterialId: string;
    rawMaterialName: string;
    rawMaterialUnitId: string;
    rawMaterialUnitName: string;
    deliveredQty: number;
    lotNo: string;
}

interface DeliveryGroup {
    deliveryNo?: string;
    deliveryDate: string;
    rawMaterialsLocationId?: string;
    rawMaterialsLocationName?: string;
    rawMaterials: DeliveredItem[];
}

interface DeliveriesTabProps {
    purchaseOrderData: any;
    status: string;
    onAddDelivery: (deliveryData: any) => void;
    onDeleteDelivery: (delivery: DeliveryGroup) => void;
    isSubmitting: boolean;
}

export function DeliveriesTab({
    purchaseOrderData,
    status,
    onAddDelivery,
    onDeleteDelivery,
    isSubmitting,
}: DeliveriesTabProps) {
    const [deliveryNo, setDeliveryNo] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [selectedLocation, setSelectedLocation] = useState<{ id: string; name: string } | null>(null);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [deliveryItems, setDeliveryItems] = useState<Record<string, { qty: string; lotNo: string }>>({});
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [deliveryToDelete, setDeliveryToDelete] = useState<DeliveryGroup | null>(null);
    const { setFlashNotification } = useSessionStore();

    const purchaseOrderDetails: OrderItem[] = purchaseOrderData?.purchaseOrderDetails || [];
    const deliveredPurchaseOrderDetails: DeliveryGroup[] = purchaseOrderData?.deliveredPurchaseOrderDetails || [];

    // Sort deliveries by date (newest first)
    const sortedDeliveries = [...deliveredPurchaseOrderDetails].sort(
        (a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
    );

    // Calculate delivery statistics for each raw material
    const getDeliveryStats = (rawMaterialId: string) => {
        const orderedItem = purchaseOrderDetails.find((item) => item.rawMaterialId === rawMaterialId);
        if (!orderedItem) return null;

        const alreadyDelivered = deliveredPurchaseOrderDetails.reduce((total, delivery) => {
            // Sum all matching raw materials in this delivery (there could be multiple with different lot numbers)
            const matchingItems = delivery.rawMaterials.filter((rm) => rm.rawMaterialId === rawMaterialId);
            const deliveryTotal = matchingItems.reduce((sum, item) => sum + (item.deliveredQty || 0), 0);
            return total + deliveryTotal;
        }, 0);

        const remaining = orderedItem.qty - alreadyDelivered;
        const deliverNow = Number(deliveryItems[rawMaterialId]?.qty || 0);

        return {
            orderedQty: orderedItem.qty,
            alreadyDelivered,
            remaining,
            deliverNow,
            willExceed: deliverNow + alreadyDelivered > orderedItem.qty,
        };
    };

    // Calculate overall completion
    const totalOrdered = purchaseOrderDetails.reduce((sum, item) => sum + item.qty, 0);
    const totalDelivered = deliveredPurchaseOrderDetails.reduce((total, delivery) => {
        return total + delivery.rawMaterials.reduce((sum, rm) => sum + rm.deliveredQty, 0);
    }, 0);
    const completionPercentage = totalOrdered > 0 ? (totalDelivered / totalOrdered) * 100 : 0;

    const handleDeliveryItemChange = (rawMaterialId: string, field: 'qty' | 'lotNo', value: string) => {
        setDeliveryItems((prev) => ({
            ...prev,
            [rawMaterialId]: {
                ...prev[rawMaterialId],
                qty: field === 'qty' ? value : prev[rawMaterialId]?.qty || '',
                lotNo: field === 'lotNo' ? value : prev[rawMaterialId]?.lotNo || '',
            },
        }));

        // Clear validation error for this item
        setValidationErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[rawMaterialId];
            return newErrors;
        });
    };

    const validateDelivery = (): boolean => {
        const errors: Record<string, string> = {};
        let hasAnyDelivery = false;

        purchaseOrderDetails.forEach((item) => {
            const stats = getDeliveryStats(item.rawMaterialId);
            if (!stats) return;

            if (stats.deliverNow > 0) {
                hasAnyDelivery = true;

                // Check for decimals
                const qtyNum = Math.floor(stats.deliverNow);
                if (qtyNum !== stats.deliverNow) {
                    errors[item.rawMaterialId] = 'Quantity must be a whole number (no decimals)';
                    return;
                }

                // Check if exceeds ordered quantity
                if (stats.willExceed) {
                    errors[
                        item.rawMaterialId
                    ] = `Cannot deliver more than ordered (${stats.orderedQty} ${item.rawMaterialUnitName})`;
                    return;
                }
            }
        });

        setValidationErrors(errors);

        if (!hasAnyDelivery) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'Please enter at least one delivery quantity.',
                alertType: 'warning',
            });
            return false;
        }

        return Object.keys(errors).length === 0;
    };

    const handleSaveDelivery = () => {
        if (status !== 'ACTIVE') {
            setFlashNotification({
                title: 'Not Allowed',
                message: 'Deliveries can only be recorded for ACTIVE purchase orders.',
                alertType: 'warning',
            });
            return;
        }

        if (!deliveryNo.trim()) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'Delivery No is required.',
                alertType: 'warning',
            });
            return;
        }

        // Check deliveryNo + deliveryDate uniqueness within the PO
        const duplicateDelivery = deliveredPurchaseOrderDetails.find(
            (d) => d.deliveryNo === deliveryNo.trim() && d.deliveryDate === deliveryDate
        );
        if (duplicateDelivery) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'A delivery with this Delivery No and Date already exists on this purchase order.',
                alertType: 'warning',
            });
            return;
        }

        if (!deliveryDate) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'Delivery date is required.',
                alertType: 'warning',
            });
            return;
        }

        if (!selectedLocation) {
            setFlashNotification({
                title: 'Validation Error',
                message: 'Raw materials location is required.',
                alertType: 'warning',
            });
            return;
        }

        if (!validateDelivery()) {
            return;
        }

        const rawMaterials: DeliveredItem[] = [];
        purchaseOrderDetails.forEach((item) => {
            const deliverNow = Number(deliveryItems[item.rawMaterialId]?.qty || 0);
            if (deliverNow > 0) {
                rawMaterials.push({
                    rawMaterialId: item.rawMaterialId,
                    rawMaterialName: item.rawMaterialName,
                    rawMaterialUnitId: item.rawMaterialUnitId,
                    rawMaterialUnitName: item.rawMaterialUnitName,
                    deliveredQty: Math.floor(deliverNow),
                    lotNo: deliveryItems[item.rawMaterialId]?.lotNo || '',
                });
            }
        });

        onAddDelivery({
            deliveryNo: deliveryNo.trim(),
            deliveryDate,
            rawMaterialsLocationId: selectedLocation?.id,
            rawMaterialsLocationName: selectedLocation?.name,
            rawMaterials,
        });

        // Reset form
        setDeliveryNo('');
        setDeliveryDate('');
        setSelectedLocation(null);
        setDeliveryItems({});
        setValidationErrors({});
    };

    const handleLocationSelect = (location: RawMaterialsLocationDto) => {
        setSelectedLocation({
            id: location.rawMaterialsLocationId || '',
            name: location.rawMaterialsLocationName || '',
        });
        setShowLocationModal(false);
    };

    const handleClearLocation = () => {
        setSelectedLocation(null);
    };

    const handleDeleteDelivery = (deliveryNo: string | undefined, deliveryDate: string) => {
        if (status !== 'ACTIVE') {
            setFlashNotification({
                title: 'Not Allowed',
                message: 'Deliveries can only be deleted from ACTIVE purchase orders.',
                alertType: 'warning',
            });
            return;
        }

        // Find the complete delivery object by composite key
        const delivery = deliveredPurchaseOrderDetails.find(
            (d) => d.deliveryDate === deliveryDate && d.deliveryNo === deliveryNo
        );
        if (!delivery) {
            setFlashNotification({
                title: 'Error',
                message: 'Delivery not found.',
                alertType: 'error',
            });
            return;
        }

        setDeliveryToDelete(delivery);
        setShowDeleteConfirmation(true);
    };

    const confirmDeleteDelivery = () => {
        if (deliveryToDelete) {
            onDeleteDelivery(deliveryToDelete);
        }
        setShowDeleteConfirmation(false);
        setDeliveryToDelete(null);
    };

    const isDisabled = status !== 'ACTIVE';

    return (
        <div className="space-y-6">
            {/* Record New Delivery Section */}
            <Disclosure defaultOpen={true}>
                {({ open }) => (
                    <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm overflow-hidden">
                        <Disclosure.Button className="flex w-full items-center justify-between bg-blue-50 px-6 py-4 text-left hover:bg-blue-100 transition-colors">
                            <h3 className="text-lg font-semibold text-gray-900">Record New Delivery</h3>
                            <svg
                                className={`${
                                    open ? 'transform rotate-180' : ''
                                } h-6 w-6 text-gray-500 transition-transform`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </Disclosure.Button>

                        <Disclosure.Panel className="p-6 space-y-4">
                            {isDisabled && (
                                <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <Warning size={24} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-yellow-800">
                                                Purchase Order Not Active
                                            </h4>
                                            <p className="mt-1 text-sm text-yellow-700">
                                                Deliveries can only be recorded for purchase orders with ACTIVE status.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Delivery No <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={deliveryNo}
                                    onChange={(e) => setDeliveryNo(e.target.value)}
                                    disabled={isDisabled || isSubmitting}
                                    placeholder="Enter delivery number"
                                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Delivery Date <span className="text-red-500">*</span>
                                </label>
                                <DatePicker
                                    value={deliveryDate}
                                    onChange={(date) => setDeliveryDate(date)}
                                    disabled={isDisabled || isSubmitting}
                                    placeholder="Select delivery date"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Raw Materials Location <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={selectedLocation?.name || ''}
                                        readOnly
                                        onClick={() => !isDisabled && !isSubmitting && setShowLocationModal(true)}
                                        placeholder="Select location"
                                        disabled={isDisabled || isSubmitting}
                                        className="w-full cursor-pointer rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50"
                                    />
                                    {selectedLocation && !isDisabled && !isSubmitting && (
                                        <button
                                            type="button"
                                            onClick={handleClearLocation}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <Close size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <RawMaterialsLocationSearchableSelectionModal
                                show={showLocationModal}
                                title="Select Raw Materials Location"
                                selectedValue={selectedLocation?.id || null}
                                onSelect={handleLocationSelect}
                                onClose={() => setShowLocationModal(false)}
                            />

                            <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
                                <table className="w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/4">
                                                Raw Material
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[12%]">
                                                Unit
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[12%]">
                                                Ordered Qty
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[12%]">
                                                Already Delivered
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[12%]">
                                                Remaining
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[12%]">
                                                Deliver Now
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[15%]">
                                                Lot No
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {purchaseOrderDetails.map((item) => {
                                            const stats = getDeliveryStats(item.rawMaterialId);
                                            const hasError = validationErrors[item.rawMaterialId];

                                            return (
                                                <tr
                                                    key={item.rawMaterialId}
                                                    className={hasError ? 'bg-red-50' : 'hover:bg-gray-50'}
                                                >
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                        {item.rawMaterialName}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-700">
                                                        {item.rawMaterialUnitName}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-700">
                                                        {stats?.orderedQty || 0}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-700">
                                                        {stats?.alreadyDelivered || 0}
                                                    </td>
                                                    <td
                                                        className={`px-6 py-4 text-sm font-semibold ${
                                                            stats && stats.remaining > 0
                                                                ? 'text-blue-600'
                                                                : 'text-green-600'
                                                        }`}
                                                    >
                                                        {stats?.remaining || 0}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            <input
                                                                type="number"
                                                                value={deliveryItems[item.rawMaterialId]?.qty || ''}
                                                                onChange={(e) =>
                                                                    handleDeliveryItemChange(
                                                                        item.rawMaterialId,
                                                                        'qty',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                disabled={isDisabled || isSubmitting}
                                                                step="1"
                                                                min="0"
                                                                className={`w-24 rounded-xl border-2 ${
                                                                    hasError ? 'border-red-500' : 'border-gray-200'
                                                                } px-3 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100`}
                                                            />
                                                            {hasError && (
                                                                <p className="text-xs text-red-600">{hasError}</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="text"
                                                            value={deliveryItems[item.rawMaterialId]?.lotNo || ''}
                                                            onChange={(e) =>
                                                                handleDeliveryItemChange(
                                                                    item.rawMaterialId,
                                                                    'lotNo',
                                                                    e.target.value
                                                                )
                                                            }
                                                            disabled={isDisabled || isSubmitting}
                                                            className={`w-32 rounded-xl border-2 ${
                                                                hasError && hasError.includes('Lot')
                                                                    ? 'border-red-500'
                                                                    : 'border-gray-200'
                                                            } px-3 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100`}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveDelivery}
                                    disabled={isDisabled || isSubmitting}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-8 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Delivery'}
                                </button>
                            </div>
                        </Disclosure.Panel>
                    </div>
                )}
            </Disclosure>

            {/* Recorded Deliveries */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recorded Deliveries</h3>
                {sortedDeliveries.length === 0 ? (
                    <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
                        <p className="text-gray-500">No deliveries recorded yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedDeliveries.map((delivery, index) => (
                            <Disclosure key={index}>
                                {({ open }) => (
                                    <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm overflow-hidden">
                                        <Disclosure.Button className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-900">
                                                        {delivery.deliveryNo && (
                                                            <span className="text-blue-600">{delivery.deliveryNo}</span>
                                                        )}
                                                        {delivery.deliveryNo && ' \u2014 '}
                                                        Delivery on{' '}
                                                        {new Date(delivery.deliveryDate).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {delivery.rawMaterials.length} item(s) -{' '}
                                                        {delivery.rawMaterials.reduce(
                                                            (sum, rm) => sum + rm.deliveredQty,
                                                            0
                                                        )}{' '}
                                                        total units
                                                        {delivery.rawMaterialsLocationName && (
                                                            <>
                                                                {' '}
                                                                • Location:{' '}
                                                                <span className="font-medium text-gray-700">
                                                                    {delivery.rawMaterialsLocationName}
                                                                </span>
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteDelivery(
                                                            delivery.deliveryNo,
                                                            delivery.deliveryDate
                                                        );
                                                    }}
                                                    disabled={isDisabled || isSubmitting}
                                                    className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Close size={20} />
                                                </button>
                                                <svg
                                                    className={`${
                                                        open ? 'transform rotate-180' : ''
                                                    } h-6 w-6 text-gray-500 transition-transform`}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M5 15l7-7 7 7"
                                                    />
                                                </svg>
                                            </div>
                                        </Disclosure.Button>

                                        <Disclosure.Panel className="border-t border-gray-200">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Raw Material
                                                            </th>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Unit
                                                            </th>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Delivered Qty
                                                            </th>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Lot No
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {delivery.rawMaterials.map((rm, rmIndex) => (
                                                            <tr
                                                                key={rmIndex}
                                                                className="hover:bg-gray-50 transition-colors"
                                                            >
                                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                                    {rm.rawMaterialName}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-700">
                                                                    {rm.rawMaterialUnitName}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                                                                    {rm.deliveredQty}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-700">
                                                                    {rm.lotNo}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Disclosure.Panel>
                                    </div>
                                )}
                            </Disclosure>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && deliveryToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 text-xl">
                                ⚠️
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 m-0">Delete Delivery</h3>
                        </div>

                        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                            Are you sure you want to delete delivery{' '}
                            {deliveryToDelete.deliveryNo && (
                                <>
                                    <strong>{deliveryToDelete.deliveryNo}</strong> on{' '}
                                </>
                            )}
                            {!deliveryToDelete.deliveryNo && 'on '}
                            <strong>
                                {new Date(deliveryToDelete.deliveryDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                })}
                            </strong>
                            ?
                            {deliveryToDelete.rawMaterialsLocationName && (
                                <>
                                    {' '}
                                    (Location: <strong>{deliveryToDelete.rawMaterialsLocationName}</strong>)
                                </>
                            )}
                            <br />
                            <br />
                            This will remove <strong>{deliveryToDelete.rawMaterials.length} item(s)</strong> from the
                            delivery records and adjust stock quantities accordingly. This action cannot be undone.
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirmation(false);
                                    setDeliveryToDelete(null);
                                }}
                                className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center gap-2"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteDelivery}
                                disabled={isSubmitting}
                                className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-sm hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
