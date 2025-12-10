'use client';

import { DeliveryDetailsDto, ProductDto, ProductUnitDto, StatusEnum, StockDeliveryDto, StockTypeDto, SupplierDto, useSessionStore } from '@data-access/index';
import { useEffect, useState } from 'react';
import { ChangeReasonField } from '../../../../../components';
import DatePicker from '../../../../../components/DatePicker';
import ProductSearchableSelectionModal from '../../../../../search-modals/ProductSearchableSelectionModal';
import ProductUnitSearchableSelectionModal from '../../../../../search-modals/ProductUnitSearchableSelectionModal';
import StockTypeSearchableSelectionModal from '../../../../../search-modals/StockTypeSearchableSelectionModal';
import SupplierSearchableSelectionModal from '../../../../../search-modals/SupplierSearchableSelectionModal';

interface StockDeliveryFormProps {
  isCreateMode: boolean;
  selectedStockDelivery: StockDeliveryDto | null;
  successMessage: string | null;
  onSave: (stockDelivery: StockDeliveryDto) => void;
  onDelete: () => void;
  onCancel: () => void;
  isAdminUser?: boolean;
}

interface StockSelectionState {
  selectedProduct: ProductDto | null;
  selectedProductUnit: ProductUnitDto | null;
  selectedStockType: StockTypeDto | null;
  lotNo: string;
  expirationDate: string;
  quantity: number;
  showProductModal: boolean;
  showProductUnitModal: boolean;
  showStockTypeModal: boolean;
  showSupplierModal: boolean;
}

export default function StockDeliveryForm({
  isCreateMode,
  selectedStockDelivery,
  successMessage,
  onSave,
  onDelete,
  onCancel,
  isAdminUser = false
}: StockDeliveryFormProps) {
  const { setFlashNotification } = useSessionStore();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState<StockDeliveryDto>({
    docno: '',
    dateReceived: new Date().toISOString().split('T')[0],
    supplierId: '',
    supplierName: '',
    deliveryDetails: [],
    changeReason: ''
  });

  const [stockSelection, setStockSelection] = useState<StockSelectionState>({
    selectedProduct: null,
    selectedProductUnit: null,
    selectedStockType: null,
    lotNo: '',
    expirationDate: '',
    quantity: 0,
    showProductModal: false,
    showProductUnitModal: false,
    showStockTypeModal: false,
    showSupplierModal: false
  });

  useEffect(() => {
    if (!isCreateMode && selectedStockDelivery) {
      setFormData({
        docno: selectedStockDelivery.docno || '',
        dateReceived: selectedStockDelivery.dateReceived || new Date().toISOString().split('T')[0],
        supplierId: selectedStockDelivery.supplierId || '',
        supplierName: selectedStockDelivery.supplierName || '',
        deliveryDetails: selectedStockDelivery.deliveryDetails || [],
        changeReason: selectedStockDelivery.changeReason || ''
      });
    } else if (isCreateMode) {
      setFormData({
        docno: '',
        dateReceived: new Date().toISOString().split('T')[0],
        supplierId: '',
        supplierName: '',
        deliveryDetails: [],
        changeReason: ''
      });
    }
  }, [isCreateMode, selectedStockDelivery]);

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.docno.trim()) {
      errors.push('Document Number is required.');
    }
    if (!formData.supplierId) {
      errors.push('Supplier is required.');
    }
    if (!formData.dateReceived) {
      errors.push('Date Received is required.');
    }
    if (!formData.deliveryDetails || formData.deliveryDetails.length === 0) {
      errors.push('At least one stock item must be added to delivery details.');
    } else {
      formData.deliveryDetails.forEach((detail, index) => {
        if (!detail.productId || !detail.productUnitId || !detail.stockTypeId || 
            detail.qty === undefined || detail.qty === null || detail.qty <= 0 || isNaN(detail.qty)) {
          errors.push(`Delivery detail item ${index + 1} has incomplete information (product, unit, stock type, or quantity missing/invalid).`);
        }
        if (!detail.lotNo || detail.lotNo.trim() === '') {
          errors.push(`Delivery detail item ${index + 1} is missing a Lot Number.`);
        }
        if (!detail.expirationDate || detail.expirationDate.trim() === '') {
          errors.push(`Delivery detail item ${index + 1} is missing an Expiration Date.`);
        }
      });
    }

    if (!isCreateMode && !isAdminUser && (!formData.changeReason || formData.changeReason.trim() === '')) {
      errors.push('Please provide a reason for the change.');
    }

    return errors;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    const newStatus = isCreateMode ? StatusEnum.NEW_RECORD : (isAdminUser ? StatusEnum.ACTIVE : StatusEnum.FOR_APPROVAL);

    const stockDeliveryToSave: StockDeliveryDto = {
      ...selectedStockDelivery,
      ...formData,
      status: newStatus,
      changeReason: formData.changeReason.trim() || undefined,
      deliveryDetails: formData.deliveryDetails
    };
    onSave(stockDeliveryToSave);
  };

  const handleAddDetailRecord = () => {
    if (!stockSelection.selectedProduct || !stockSelection.selectedProductUnit ||
        !stockSelection.selectedStockType || stockSelection.quantity <= 0 ||
        !stockSelection.lotNo.trim() || !stockSelection.expirationDate.trim()) {
      setFlashNotification({
        title: 'Missing Information',
        message: 'Please select product, product unit, stock type, enter lot number, expiration date, and quantity.',
        alertType: 'warning'
      });
      return;
    }

    const hasDuplicate = (formData.deliveryDetails || []).some(d =>
      d.productId === stockSelection.selectedProduct?.productId &&
      d.lotNo === stockSelection.lotNo
    );
    if (hasDuplicate) {
      setFlashNotification({
        title: 'Duplicate Item',
        message: 'An item with the same product and lot is already added.',
        alertType: 'warning'
      });
      return;
    }

    const newDetail: DeliveryDetailsDto = {
      productId: stockSelection.selectedProduct.productId || '',
      productName: stockSelection.selectedProduct.productName || '',
      productUnitId: stockSelection.selectedProductUnit.productUnitId,
      productUnitName: stockSelection.selectedProductUnit.productUnitName,
      stockTypeId: stockSelection.selectedStockType.stockTypeId,
      stockTypeName: stockSelection.selectedStockType.stockTypeName,
      lotNo: stockSelection.lotNo.trim(),
      expirationDate: stockSelection.expirationDate.trim(),
      qty: Number(stockSelection.quantity)
    };

    setFormData(prev => ({
      ...prev,
      deliveryDetails: [...(prev.deliveryDetails || []), newDetail]
    }));

    // Reset stock selection fields
    setStockSelection(prev => ({
      ...prev,
      selectedProduct: null,
      selectedProductUnit: null,
      selectedStockType: null,
      lotNo: '',
      expirationDate: '',
      quantity: 0
    }));
  };

  const handleRemoveDetailRecord = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      deliveryDetails: (prev.deliveryDetails || []).filter((_, index) => index !== indexToRemove)
    }));
  };

  const isFormDisabled = !isCreateMode && selectedStockDelivery?.status !== StatusEnum.ACTIVE;

  return (
    <form onSubmit={handleSubmit}>
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-green-500 bg-green-50 p-4 text-green-700 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
            ✓
          </div>
          <span className="text-sm font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4 space-y-3 rounded-xl border-2 border-red-500 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <span className="text-base">⚠️</span>
            <span>Please fix the following errors:</span>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Pending Approval/Deletion Warning */}
      {!isCreateMode && selectedStockDelivery &&
        (selectedStockDelivery.status === StatusEnum.FOR_APPROVAL ||
          selectedStockDelivery.status === StatusEnum.NEW_RECORD ||
          selectedStockDelivery.status === StatusEnum.FOR_DELETION) && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-yellow-500 bg-yellow-50 p-4 text-yellow-700 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
              ⚠
            </div>
            <span className="text-sm font-semibold">
              {selectedStockDelivery.status === StatusEnum.FOR_DELETION
                ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
                : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
            </span>
          </div>
        )}

      {/* Change Reason Field - First component when displayed */}
      {!isCreateMode && !isAdminUser && (
        <ChangeReasonField
          value={formData.changeReason}
          onChange={(e) => setFormData(prev => ({ ...prev, changeReason: e.target.value }))}
          disabled={selectedStockDelivery?.status !== StatusEnum.ACTIVE}
        />
      )}

      <div className="space-y-6">
        {/* Stock Delivery Information Section */}
        <div className="rounded-xl border-2 border-gray-200 p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2 shadow-md">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-blue-600">
              Stock Delivery Information
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="group">
              <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                Document Number
              </label>
              <input
                type="text"
                name="docno"
                value={formData.docno}
                onChange={(e) => setFormData(prev => ({ ...prev, docno: e.target.value }))}
                placeholder={isCreateMode ? 'Enter document number' : ''}
                disabled={isFormDisabled}
                className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                  isFormDisabled
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                    : 'border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                }`}
                required
              />
            </div>
            <div className="group">
              <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                Date Received
              </label>
              <DatePicker
                value={formData.dateReceived}
                onChange={(date) => setFormData(prev => ({ ...prev, dateReceived: date }))}
                disabled={isFormDisabled}
                placeholder="Select date received"
              />
            </div>
            <div className="group sm:col-span-2">
              <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                Supplier
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.supplierName || ''}
                  readOnly
                  placeholder="Select a supplier"
                  disabled={isFormDisabled}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                    isFormDisabled
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                      : 'cursor-pointer border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                  }`}
                  onClick={() => !isFormDisabled && setStockSelection(prev => ({ ...prev, showSupplierModal: true }))}
                  required
                />
                {formData.supplierName && !isFormDisabled && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, supplierId: '', supplierName: '' }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                )}
              </div>
              <SupplierSearchableSelectionModal
                show={stockSelection.showSupplierModal}
                onClose={() => setStockSelection(prev => ({ ...prev, showSupplierModal: false }))}
                onSelect={(supplier: SupplierDto) => setFormData(prev => ({ ...prev, supplierId: supplier.supplierId, supplierName: supplier.supplierName }))}
              />
            </div>
          </div>
        </div>

        {/* Stock Items Section */}
        <div className="rounded-xl border-2 border-gray-200 p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2 shadow-md">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h-10a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2zM9 10h6M9 14h6M9 18h6" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-blue-600">
              Stock Items
            </h3>
          </div>

          {!isFormDisabled && (
            <div className="mb-6 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 sm:p-6">
              <h4 className="mb-4 text-sm font-bold text-gray-700">Add New Stock Item</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Product Selection */}
                <div className="group">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Product</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={stockSelection.selectedProduct?.productName || ''}
                      readOnly
                      placeholder="Select product"
                      className="w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 cursor-pointer border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md"
                      onClick={() => setStockSelection(prev => ({ ...prev, showProductModal: true }))}
                    />
                    {stockSelection.selectedProduct && (
                      <button
                        type="button"
                        onClick={() => setStockSelection(prev => ({ ...prev, selectedProduct: null, selectedProductUnit: null }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <ProductSearchableSelectionModal
                    show={stockSelection.showProductModal}
                    title="Select Product"
                    selectedValue={stockSelection.selectedProduct?.productId || null}
                    onSelect={(product: ProductDto) => setStockSelection(prev => ({ ...prev, selectedProduct: product, showProductModal: false }))}
                    onClose={() => setStockSelection(prev => ({ ...prev, showProductModal: false }))}
                    skipDealSelection={true}
                  />
                </div>

                {/* Product Unit Selection */}
                <div className="group">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Unit</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={stockSelection.selectedProductUnit?.productUnitName || ''}
                      readOnly
                      placeholder="Select unit"
                      disabled={!stockSelection.selectedProduct}
                      className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                        !stockSelection.selectedProduct
                          ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                          : 'cursor-pointer border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md'
                      }`}
                      onClick={() => stockSelection.selectedProduct && setStockSelection(prev => ({ ...prev, showProductUnitModal: true }))}
                    />
                    {stockSelection.selectedProductUnit && (
                      <button
                        type="button"
                        onClick={() => setStockSelection(prev => ({ ...prev, selectedProductUnit: null }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <ProductUnitSearchableSelectionModal
                    show={stockSelection.showProductUnitModal}
                    onClose={() => setStockSelection(prev => ({ ...prev, showProductUnitModal: false }))}
                    onSelect={(unit: ProductUnitDto) => setStockSelection(prev => ({ ...prev, selectedProductUnit: unit, showProductUnitModal: false }))}
                    productId={stockSelection.selectedProduct?.productId}
                  />
                </div>

                {/* Stock Type Selection */}
                <div className="group">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Stock Type</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={stockSelection.selectedStockType?.stockTypeName || ''}
                      readOnly
                      placeholder="Select stock type"
                      className="w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 cursor-pointer border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md"
                      onClick={() => setStockSelection(prev => ({ ...prev, showStockTypeModal: true }))}
                    />
                    {stockSelection.selectedStockType && (
                      <button
                        type="button"
                        onClick={() => setStockSelection(prev => ({ ...prev, selectedStockType: null }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <StockTypeSearchableSelectionModal
                    show={stockSelection.showStockTypeModal}
                    onClose={() => setStockSelection(prev => ({ ...prev, showStockTypeModal: false }))}
                    onSelect={(stockType: StockTypeDto) => setStockSelection(prev => ({ ...prev, selectedStockType: stockType, showStockTypeModal: false }))}
                  />
                </div>

                {/* Lot Number */}
                <div className="group">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Lot Number</label>
                  <input
                    type="text"
                    value={stockSelection.lotNo}
                    onChange={(e) => setStockSelection(prev => ({ ...prev, lotNo: e.target.value }))}
                    placeholder="Enter lot number"
                    className="w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md"
                  />
                </div>

                {/* Expiration Date */}
                <div className="group">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Expiration Date</label>
                  <DatePicker
                    value={stockSelection.expirationDate}
                    onChange={(date) => setStockSelection(prev => ({ ...prev, expirationDate: date }))}
                    placeholder="Select expiration date"
                  />
                </div>

                {/* Quantity */}
                <div className="group">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    value={stockSelection.quantity === 0 ? '' : stockSelection.quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = value === '' ? 0 : (isNaN(Number(value)) ? 0 : Number(value));
                      setStockSelection(prev => ({ ...prev, quantity: numValue }));
                    }}
                    placeholder="Enter quantity"
                    min="1"
                    className="w-full rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 border-gray-200 bg-white text-gray-700 group-hover:border-blue-300 group-hover:shadow-md"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddDetailRecord}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>
            </div>
          )}

          {/* Display Added Stock Items */}
          {formData.deliveryDetails && formData.deliveryDetails.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-white border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">Product</th>
                      <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">Unit</th>
                      <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">Stock Type</th>
                      <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">Lot No</th>
                      <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">Exp. Date</th>
                      <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">Qty</th>
                      {!isFormDisabled && <th className="px-6 py-4 text-left text-gray-700 font-semibold text-xs uppercase tracking-wider">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.deliveryDetails.map((detail, index) => (
                      <tr key={index} className="transition-all duration-200 bg-white hover:bg-gray-50">
                        <td className="px-6 py-5 text-sm font-medium text-gray-900">{detail.productName}</td>
                        <td className="px-6 py-5 text-sm text-gray-600">{detail.productUnitName}</td>
                        <td className="px-6 py-5 text-sm text-gray-600">{detail.stockTypeName}</td>
                        <td className="px-6 py-5 text-sm text-gray-600">{detail.lotNo}</td>
                        <td className="px-6 py-5 text-sm text-gray-600">{detail.expirationDate}</td>
                        <td className="px-6 py-5 text-sm text-gray-600">{detail.qty}</td>
                        {!isFormDisabled && (
                          <td className="px-6 py-5">
                            <button
                              type="button"
                              onClick={() => handleRemoveDetailRecord(index)}
                              disabled={isFormDisabled}
                              className={`p-2 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center ${
                                isFormDisabled
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
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
              <div className="p-10 text-center text-gray-500 text-base">
                No stock items added yet. Click &quot;Add Item&quot; to get started.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col gap-3 border-t-2 border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        {!isCreateMode && selectedStockDelivery?.status === StatusEnum.ACTIVE ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        ) : (
          <div className="hidden sm:block" />
        )}

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {(isCreateMode || selectedStockDelivery?.status === StatusEnum.ACTIVE) && (
            <button
              type="submit"
              disabled={isFormDisabled && !isAdminUser}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isCreateMode ? 'Create Stock Delivery' : 'Save Changes'}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
