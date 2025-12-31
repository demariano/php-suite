'use client';

import { Warning } from '@components-web';
import { RawMaterialApi, RawMaterialDto, RawMaterialSupplierApi, RawMaterialSupplierDto, RawMaterialUnitDto, useSessionStore } from '@data-access/index';
import { useEffect, useState } from 'react';
import { ChangeReasonField } from '../../../../../components';
import DatePicker from '../../../../../components/DatePicker';
import RawMaterialSearchableSelectionModal from '../../../../../search-modals/RawMaterialSearchableSelectionModal';
import RawMaterialSupplierSearchableSelectionModal from '../../../../../search-modals/RawMaterialSupplierSearchableSelectionModal';
import RawMaterialUnitSearchableSelectionModal from '../../../../../search-modals/RawMaterialUnitSearchableSelectionModal';

interface OrderItem {
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialUnitId?: string;
  rawMaterialUnitName: string;
  qty: number;
}

interface Supplier {
  _id: string;
  supplierName: string;
  status: string;
}

interface RawMaterial {
  _id: string;
  materialName: string;
  unit: string;
  status: string;
}

interface PurchaseOrderDetailsTabProps {
  purchaseOrderData: any;
  hasDeliveries: boolean;
  status: string;
  poStatus: string;
  isAdminUser: boolean;
  onUpdate: (data: any) => void;
  onTransitionToPending: () => void;
  isSubmitting: boolean;
}

export function PurchaseOrderDetailsTab({
  purchaseOrderData,
  hasDeliveries,
  status,
  poStatus,
  isAdminUser,
  onUpdate,
  onTransitionToPending,
  isSubmitting,
}: PurchaseOrderDetailsTabProps) {
  const { setFlashNotification } = useSessionStore();
  const [formData, setFormData] = useState({
    docNo: '',
    rawMaterialSupplierId: '',
    rawMaterialSupplierName: '',
    poDate: '',
    purchaseOrderDetails: [] as OrderItem[],
    changeReason: '',
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [selectedRawMaterial, setSelectedRawMaterial] = useState('');
  const [qty, setQty] = useState('');
  
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showRawMaterialModal, setShowRawMaterialModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<RawMaterialSupplierDto | null>(null);
  const [selectedRawMaterialObj, setSelectedRawMaterialObj] = useState<RawMaterialDto | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<RawMaterialUnitDto | null>(null);

  useEffect(() => {
    if (purchaseOrderData) {
      setFormData({
        docNo: purchaseOrderData.docNo || '',
        rawMaterialSupplierId: purchaseOrderData.rawMaterialSupplierId || '',
        rawMaterialSupplierName: purchaseOrderData.rawMaterialSupplierName || '',
        poDate: purchaseOrderData.poDate || '',
        purchaseOrderDetails: purchaseOrderData.purchaseOrderDetails || [],
        changeReason: '',
      });
    }
  }, [purchaseOrderData]);

  useEffect(() => {
    fetchSuppliers();
    fetchRawMaterials();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await RawMaterialSupplierApi.getRawMaterialSuppliers({ status: 'ACTIVE' });
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchRawMaterials = async () => {
    try {
      const response = await RawMaterialApi.getRawMaterials({ status: 'ACTIVE' });
      setRawMaterials(response.data || []);
    } catch (error) {
      console.error('Failed to fetch raw materials:', error);
    }
  };

  const handleSupplierSelect = (supplier: RawMaterialSupplierDto) => {
    setSelectedSupplier(supplier);
    setFormData({
      ...formData,
      rawMaterialSupplierId: supplier.rawMaterialSupplierId || '',
      rawMaterialSupplierName: supplier.rawMaterialSupplierName || '',
    });
    setShowSupplierModal(false);
  };

  const clearSupplierSelection = () => {
    setSelectedSupplier(null);
    setFormData({
      ...formData,
      rawMaterialSupplierId: '',
      rawMaterialSupplierName: '',
    });
  };

  const handleRawMaterialSelect = (rawMaterial: RawMaterialDto) => {
    setSelectedRawMaterialObj(rawMaterial);
    setSelectedRawMaterial(rawMaterial.rawMaterialId || '');
    // Auto-populate unit from raw material but allow override
    const defaultUnit: RawMaterialUnitDto = {
      rawMaterialUnitId: rawMaterial.rawMaterialUnitId || '',
      rawMaterialUnitName: rawMaterial.rawMaterialUnitName || ''
    };
    setSelectedUnit(defaultUnit);
    setShowRawMaterialModal(false);
  };

  const clearRawMaterialSelection = () => {
    setSelectedRawMaterialObj(null);
    setSelectedRawMaterial('');
    setSelectedUnit(null);
  };

  const handleUnitSelect = (unit: RawMaterialUnitDto) => {
    setSelectedUnit(unit);
    setShowUnitModal(false);
  };

  const clearUnitSelection = () => {
    setSelectedUnit(null);
  };

  const handleAddOrderItem = () => {
    if (!selectedRawMaterial || !selectedUnit || !qty || Number(qty) <= 0) {
      setFlashNotification({
        title: 'Missing Information',
        message: 'Please select a raw material, unit, and enter a valid quantity.',
        alertType: 'warning'
      });
      return;
    }

    const qtyNum = Math.floor(Number(qty));
    if (qtyNum !== Number(qty)) {
      setFlashNotification({
        title: 'Invalid Quantity',
        message: 'Quantity must be a whole number (no decimals).',
        alertType: 'warning'
      });
      return;
    }

    const isDuplicate = formData.purchaseOrderDetails.some(
      (item) => item.rawMaterialId === selectedRawMaterial
    );

    if (isDuplicate) {
      setFlashNotification({
        title: 'Duplicate Item',
        message: 'This raw material has already been added.',
        alertType: 'warning'
      });
      return;
    }

    const rawMaterial = selectedRawMaterialObj || rawMaterials.find((rm) => rm._id === selectedRawMaterial);
    if (!rawMaterial) return;

    const newItem: OrderItem = {
      rawMaterialId: selectedRawMaterial,
      rawMaterialName: selectedRawMaterialObj?.rawMaterialName || rawMaterial.materialName,
      rawMaterialUnitId: selectedUnit?.rawMaterialUnitId || '',
      rawMaterialUnitName: selectedUnit?.rawMaterialUnitName || '',
      qty: qtyNum,
    };

    setFormData({
      ...formData,
      purchaseOrderDetails: [...formData.purchaseOrderDetails, newItem],
    });

    setSelectedRawMaterial('');
    setSelectedRawMaterialObj(null);
    setSelectedUnit(null);
    setQty('');
  };

  const handleRemoveOrderItem = (index: number) => {
    setFormData({
      ...formData,
      purchaseOrderDetails: formData.purchaseOrderDetails.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = () => {
    if (!formData.docNo.trim()) {
      setFlashNotification({
        title: 'Validation Error',
        message: 'Document No is required.',
        alertType: 'error'
      });
      return;
    }
    if (!formData.rawMaterialSupplierId) {
      setFlashNotification({
        title: 'Validation Error',
        message: 'Supplier is required.',
        alertType: 'error'
      });
      return;
    }
    if (!formData.poDate) {
      setFlashNotification({
        title: 'Validation Error',
        message: 'PO Date is required.',
        alertType: 'error'
      });
      return;
    }
    if (formData.purchaseOrderDetails.length === 0) {
      setFlashNotification({
        title: 'Validation Error',
        message: 'At least one ordered item is required.',
        alertType: 'error'
      });
      return;
    }
    if (!isAdminUser && !formData.changeReason.trim()) {
      setFlashNotification({
        title: 'Validation Error',
        message: 'Change reason is required.',
        alertType: 'error'
      });
      return;
    }

    onUpdate(formData);
  };

  const isDisabled = status !== 'ACTIVE' || hasDeliveries;

  return (
    <>
    <div className="space-y-6">
      {/* Warning Banner */}
      {hasDeliveries && (
        <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <Warning size={24} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-800">Purchase Order Has Deliveries</h4>
              <p className="mt-1 text-sm text-yellow-700">
                This purchase order has recorded deliveries. Only delivery records can be modified. Main fields are locked.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Warning Banner */}
      {(status === 'FOR_APPROVAL' || status === 'NEW_RECORD' || status === 'FOR_DELETION') && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-yellow-500 bg-yellow-50 p-4 text-yellow-700 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
            ⚠
          </div>
          <span className="text-sm font-semibold">
            {status === 'FOR_DELETION'
              ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
              : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
          </span>
        </div>
      )}

      {/* Change Reason Field - First component when displayed */}
      {!isAdminUser && (
        <ChangeReasonField
          value={formData.changeReason}
          onChange={(e) => setFormData({ ...formData, changeReason: e.target.value })}
          disabled={status !== 'ACTIVE'}
        />
      )}

      {/* SYSTEM_GENERATED Transition Button */}
      {poStatus === 'SYSTEM_GENERATED' && status === 'ACTIVE' && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-blue-900">System Generated Purchase Order</h4>
              <p className="mt-1 text-sm text-blue-700">
                This purchase order was automatically generated. Click the button to mark it as pending.
              </p>
            </div>
            <button
              onClick={onTransitionToPending}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isSubmitting ? 'Transitioning...' : 'Mark as Pending'}
            </button>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document No <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.docNo}
            disabled
            readOnly
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm bg-gray-100 cursor-not-allowed opacity-75"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supplier <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={formData.rawMaterialSupplierName || ''}
              onClick={() => !isDisabled && !isSubmitting && setShowSupplierModal(true)}
              placeholder="Select supplier..."
              disabled={isDisabled || isSubmitting}
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 cursor-pointer bg-white"
            />
            {formData.rawMaterialSupplierId && !isDisabled && !isSubmitting && (
              <button
                type="button"
                onClick={clearSupplierSelection}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PO Date <span className="text-red-500">*</span>
          </label>
          <DatePicker
            value={formData.poDate}
            onChange={(date) => setFormData({ ...formData, poDate: date })}
            disabled={isDisabled || isSubmitting}
            placeholder="Select PO date"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PO Status
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={poStatus}
              disabled
              className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm bg-gray-100 cursor-not-allowed"
            />
            {isAdminUser && poStatus === 'SYSTEM_GENERATED' && (
              <button
                type="button"
                onClick={onTransitionToPending}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                title="Move to Pending status"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="whitespace-nowrap">To Pending</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ordered Items */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ordered Items</h3>

        {!isDisabled && (
          <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raw Material
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={selectedRawMaterialObj ? selectedRawMaterialObj.rawMaterialName : ''}
                    onClick={() => !isSubmitting && setShowRawMaterialModal(true)}
                    placeholder="Select raw material..."
                    disabled={isSubmitting}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                  />
                  {selectedRawMaterialObj && (
                    <button
                      type="button"
                      onClick={clearRawMaterialSelection}
                      disabled={isSubmitting}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={selectedUnit ? selectedUnit.rawMaterialUnitName : ''}
                    onClick={() => !isSubmitting && setShowUnitModal(true)}
                    placeholder="Select unit..."
                    disabled={isSubmitting}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                  />
                  {selectedUnit && (
                    <button
                      type="button"
                      onClick={clearUnitSelection}
                      disabled={isSubmitting}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }}
                  disabled={isSubmitting}
                  step="1"
                  min="1"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAddOrderItem}
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        )}

        {formData.purchaseOrderDetails.length === 0 ? (
          <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-500">No items added yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border-2 border-gray-200 shadow-sm">
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
                    Quantity
                  </th>
                  {!isDisabled && (
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.purchaseOrderDetails.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {item.rawMaterialName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.rawMaterialUnitName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.qty}</td>
                    {!isDisabled && (
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveOrderItem(index)}
                          disabled={isSubmitting}
                          className={`p-2 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center ${
                            isSubmitting
                              ? 'bg-gray-500 cursor-not-allowed opacity-60'
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                          title="Remove"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save Button */}
      {status === 'ACTIVE' && !hasDeliveries && (
        <div className="mt-8 flex justify-end border-t-2 border-gray-200 pt-6">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>

      <RawMaterialSupplierSearchableSelectionModal
        show={showSupplierModal}
        title="Select Supplier"
        selectedValue={selectedSupplier?.rawMaterialSupplierId || null}
        onSelect={handleSupplierSelect}
        onClose={() => setShowSupplierModal(false)}
      />

      <RawMaterialSearchableSelectionModal
        show={showRawMaterialModal}
        title="Select Raw Material"
        selectedValue={selectedRawMaterialObj?.rawMaterialId || null}
        onSelect={handleRawMaterialSelect}
        onClose={() => setShowRawMaterialModal(false)}
      />

      <RawMaterialUnitSearchableSelectionModal
        show={showUnitModal}
        title="Select Unit"
        selectedValue={selectedUnit?.rawMaterialUnitId || null}
        onSelect={handleUnitSelect}
        onClose={() => setShowUnitModal(false)}
      />
    </>
  );
}
