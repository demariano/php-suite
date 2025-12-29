'use client';

import { Close, Warning } from '@components-web';
import { Disclosure } from '@headlessui/react';
import { useState } from 'react';

interface OrderItem {
  rawMaterialsId: string;
  rawMaterialsName: string;
  unit: string;
  qty: number;
}

interface DeliveredItem {
  rawMaterialsId: string;
  rawMaterialsName: string;
  unit: string;
  deliveredQty: number;
  lotNo: string;
}

interface DeliveryGroup {
  deliveryDate: string;
  rawMaterials: DeliveredItem[];
}

interface DeliveriesTabProps {
  purchaseOrderData: any;
  status: string;
  onAddDelivery: (deliveryData: any) => void;
  onDeleteDelivery: (deliveryDate: string) => void;
  isSubmitting: boolean;
}

export function DeliveriesTab({
  purchaseOrderData,
  status,
  onAddDelivery,
  onDeleteDelivery,
  isSubmitting,
}: DeliveriesTabProps) {
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryItems, setDeliveryItems] = useState<Record<string, { qty: string; lotNo: string }>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const purchaseOrderDetails: OrderItem[] = purchaseOrderData?.purchaseOrderDetails || [];
  const deliveredPurchaseOrderDetails: DeliveryGroup[] = purchaseOrderData?.deliveredPurchaseOrderDetails || [];

  // Sort deliveries by date (newest first)
  const sortedDeliveries = [...deliveredPurchaseOrderDetails].sort(
    (a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
  );

  // Calculate delivery statistics for each raw material
  const getDeliveryStats = (rawMaterialsId: string) => {
    const orderedItem = purchaseOrderDetails.find((item) => item.rawMaterialsId === rawMaterialsId);
    if (!orderedItem) return null;

    const alreadyDelivered = deliveredPurchaseOrderDetails.reduce((total, delivery) => {
      const deliveredItem = delivery.rawMaterials.find((rm) => rm.rawMaterialsId === rawMaterialsId);
      return total + (deliveredItem?.deliveredQty || 0);
    }, 0);

    const remaining = orderedItem.qty - alreadyDelivered;
    const deliverNow = Number(deliveryItems[rawMaterialsId]?.qty || 0);

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

  const handleDeliveryItemChange = (rawMaterialsId: string, field: 'qty' | 'lotNo', value: string) => {
    setDeliveryItems((prev) => ({
      ...prev,
      [rawMaterialsId]: {
        ...prev[rawMaterialsId],
        qty: field === 'qty' ? value : prev[rawMaterialsId]?.qty || '',
        lotNo: field === 'lotNo' ? value : prev[rawMaterialsId]?.lotNo || '',
      },
    }));

    // Clear validation error for this item
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[rawMaterialsId];
      return newErrors;
    });
  };

  const validateDelivery = (): boolean => {
    const errors: Record<string, string> = {};
    let hasAnyDelivery = false;

    purchaseOrderDetails.forEach((item) => {
      const stats = getDeliveryStats(item.rawMaterialsId);
      if (!stats) return;

      if (stats.deliverNow > 0) {
        hasAnyDelivery = true;

        // Check for decimals
        const qtyNum = Math.floor(stats.deliverNow);
        if (qtyNum !== stats.deliverNow) {
          errors[item.rawMaterialsId] = 'Quantity must be a whole number (no decimals)';
          return;
        }

        // Check if exceeds ordered quantity
        if (stats.willExceed) {
          errors[item.rawMaterialsId] = `Cannot deliver more than ordered (${stats.orderedQty} ${item.unit})`;
          return;
        }

        // Check for lot number
        const lotNo = deliveryItems[item.rawMaterialsId]?.lotNo;
        if (!lotNo || !lotNo.trim()) {
          errors[item.rawMaterialsId] = 'Lot number is required';
        }
      }
    });

    setValidationErrors(errors);

    if (!hasAnyDelivery) {
      alert('Please enter at least one delivery quantity.');
      return false;
    }

    return Object.keys(errors).length === 0;
  };

  const handleSaveDelivery = () => {
    if (status !== 'ACTIVE') {
      alert('Deliveries can only be recorded for ACTIVE purchase orders.');
      return;
    }

    if (!deliveryDate) {
      alert('Delivery date is required.');
      return;
    }

    if (!validateDelivery()) {
      return;
    }

    const rawMaterials: DeliveredItem[] = [];
    purchaseOrderDetails.forEach((item) => {
      const deliverNow = Number(deliveryItems[item.rawMaterialsId]?.qty || 0);
      if (deliverNow > 0) {
        rawMaterials.push({
          rawMaterialsId: item.rawMaterialsId,
          rawMaterialsName: item.rawMaterialsName,
          unit: item.unit,
          deliveredQty: Math.floor(deliverNow),
          lotNo: deliveryItems[item.rawMaterialsId]?.lotNo || '',
        });
      }
    });

    onAddDelivery({
      deliveryDate,
      rawMaterials,
    });

    // Reset form
    setDeliveryDate('');
    setDeliveryItems({});
    setValidationErrors({});
  };

  const handleDeleteDelivery = (deliveryDate: string) => {
    if (status !== 'ACTIVE') {
      alert('Deliveries can only be deleted from ACTIVE purchase orders.');
      return;
    }

    if (confirm(`Are you sure you want to delete the delivery on ${new Date(deliveryDate).toLocaleDateString()}?`)) {
      onDeleteDelivery(deliveryDate);
    }
  };

  const isDisabled = status !== 'ACTIVE';

  return (
    <div className="space-y-6">
      {/* Completion Status Card */}
      <div className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Order Completion Status</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Total Ordered:</span>
            <span className="font-semibold text-gray-900">{totalOrdered} units</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Total Delivered:</span>
            <span className="font-semibold text-gray-900">{totalDelivered} units</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Remaining:</span>
            <span className="font-semibold text-gray-900">{totalOrdered - totalDelivered} units</span>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">Completion:</span>
              <span className="font-semibold text-gray-900">{completionPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Record New Delivery Section */}
      <Disclosure defaultOpen={true}>
        {({ open }) => (
          <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm overflow-hidden">
            <Disclosure.Button className="flex w-full items-center justify-between bg-blue-50 px-6 py-4 text-left hover:bg-blue-100 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900">Record New Delivery</h3>
              <svg
                className={`${open ? 'transform rotate-180' : ''} h-6 w-6 text-gray-500 transition-transform`}
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
                      <h4 className="text-sm font-semibold text-yellow-800">Purchase Order Not Active</h4>
                      <p className="mt-1 text-sm text-yellow-700">
                        Deliveries can only be recorded for purchase orders with ACTIVE status.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  disabled={isDisabled || isSubmitting}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>

              <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
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
                        Ordered Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Already Delivered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Remaining
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Deliver Now
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Lot No
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchaseOrderDetails.map((item) => {
                      const stats = getDeliveryStats(item.rawMaterialsId);
                      const hasError = validationErrors[item.rawMaterialsId];

                      return (
                        <tr key={item.rawMaterialsId} className={hasError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {item.rawMaterialsName}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{item.unit}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{stats?.orderedQty || 0}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{stats?.alreadyDelivered || 0}</td>
                          <td className={`px-6 py-4 text-sm font-semibold ${stats && stats.remaining > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                            {stats?.remaining || 0}
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <input
                                type="number"
                                value={deliveryItems[item.rawMaterialsId]?.qty || ''}
                                onChange={(e) => handleDeliveryItemChange(item.rawMaterialsId, 'qty', e.target.value)}
                                disabled={isDisabled || isSubmitting}
                                step="1"
                                min="0"
                                className={`w-24 rounded-xl border-2 ${hasError ? 'border-red-500' : 'border-gray-200'} px-3 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100`}
                              />
                              {hasError && (
                                <p className="text-xs text-red-600">{hasError}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={deliveryItems[item.rawMaterialsId]?.lotNo || ''}
                              onChange={(e) => handleDeliveryItemChange(item.rawMaterialsId, 'lotNo', e.target.value)}
                              disabled={isDisabled || isSubmitting}
                              className={`w-32 rounded-xl border-2 ${hasError && hasError.includes('Lot') ? 'border-red-500' : 'border-gray-200'} px-3 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100`}
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
                            Delivery on {new Date(delivery.deliveryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {delivery.rawMaterials.length} item(s) - {delivery.rawMaterials.reduce((sum, rm) => sum + rm.deliveredQty, 0)} total units
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDelivery(delivery.deliveryDate);
                          }}
                          disabled={isDisabled || isSubmitting}
                          className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Close size={20} />
                        </button>
                        <svg
                          className={`${open ? 'transform rotate-180' : ''} h-6 w-6 text-gray-500 transition-transform`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
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
                              <tr key={rmIndex} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                  {rm.rawMaterialsName}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">{rm.unit}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                                  {rm.deliveredQty}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">{rm.lotNo}</td>
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
    </div>
  );
}
