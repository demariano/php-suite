'use client';

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

interface ApprovalTabProps {
  purchaseOrderData: any;
  status: string;
  onApprove: () => void;
  onDeny: () => void;
  isSubmitting: boolean;
}

export function ApprovalTab({
  purchaseOrderData,
  status,
  onApprove,
  onDeny,
  isSubmitting,
}: ApprovalTabProps) {
  const forApprovalVersion = purchaseOrderData?.forApprovalVersion;
  const isForDeletion = status === 'FOR_DELETION';
  const isForApproval = status === 'FOR_APPROVAL';

  if (!isForApproval && !isForDeletion) {
    return (
      <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-500">No approval required. The purchase order is {status}.</p>
      </div>
    );
  }

  const createFieldChangeDetector = (field: string) => {
    const originalValue = purchaseOrderData[field];
    const proposedValue = forApprovalVersion?.[field];

    if (originalValue === proposedValue || proposedValue === undefined) {
      return null;
    }

    return { originalValue, proposedValue };
  };

  const docNoChange = createFieldChangeDetector('docNo');
  const supplierIdChange = createFieldChangeDetector('rawMaterialSupplierId');
  const supplierNameChange = createFieldChangeDetector('rawMaterialSupplierName');
  const poDateChange = createFieldChangeDetector('poDate');
  const poStatusChange = createFieldChangeDetector('poStatus');

  const renderFieldComparison = (label: string, change: any) => {
    if (!change) return null;

    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700 uppercase mb-2">Original</p>
          <p className="text-sm font-medium text-gray-900">{change.originalValue || '(empty)'}</p>
        </div>
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
          <p className="text-xs font-semibold text-green-700 uppercase mb-2">Proposed</p>
          <p className="text-sm font-medium text-gray-900">{change.proposedValue || '(empty)'}</p>
        </div>
      </div>
    );
  };

  const renderOrderItemsComparison = () => {
    const originalItems: OrderItem[] = purchaseOrderData?.purchaseOrderDetails || [];
    const proposedItems: OrderItem[] = forApprovalVersion?.purchaseOrderDetails || [];

    if (JSON.stringify(originalItems) === JSON.stringify(proposedItems)) {
      return null;
    }

    return (
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Ordered Items Changes</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
            <p className="text-xs font-semibold text-red-700 uppercase mb-3">Original Items</p>
            {originalItems.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No items</p>
            ) : (
              <div className="space-y-2">
                {originalItems.map((item, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-red-100">
                    <p className="text-sm font-medium text-gray-900">{item.rawMaterialsName}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Qty: {item.qty} {item.unit}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
            <p className="text-xs font-semibold text-green-700 uppercase mb-3">Proposed Items</p>
            {proposedItems.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No items</p>
            ) : (
              <div className="space-y-2">
                {proposedItems.map((item, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-green-100">
                    <p className="text-sm font-medium text-gray-900">{item.rawMaterialsName}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Qty: {item.qty} {item.unit}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDeliveriesComparison = () => {
    const originalDeliveries: DeliveryGroup[] = purchaseOrderData?.deliveredPurchaseOrderDetails || [];
    const proposedDeliveries: DeliveryGroup[] = forApprovalVersion?.deliveredPurchaseOrderDetails || [];

    if (JSON.stringify(originalDeliveries) === JSON.stringify(proposedDeliveries)) {
      return null;
    }

    return (
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Delivered Items Changes</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
            <p className="text-xs font-semibold text-red-700 uppercase mb-3">Original Deliveries</p>
            {originalDeliveries.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No deliveries</p>
            ) : (
              <div className="space-y-3">
                {originalDeliveries.map((delivery, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-red-100">
                    <p className="text-sm font-semibold text-gray-900 mb-2">
                      {new Date(delivery.deliveryDate).toLocaleDateString()}
                    </p>
                    <div className="space-y-1">
                      {delivery.rawMaterials.map((rm, rmIndex) => (
                        <div key={rmIndex} className="text-xs text-gray-700">
                          <span className="font-medium">{rm.rawMaterialsName}:</span> {rm.deliveredQty} {rm.unit} (Lot: {rm.lotNo})
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
            <p className="text-xs font-semibold text-green-700 uppercase mb-3">Proposed Deliveries</p>
            {proposedDeliveries.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No deliveries</p>
            ) : (
              <div className="space-y-3">
                {proposedDeliveries.map((delivery, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-green-100">
                    <p className="text-sm font-semibold text-gray-900 mb-2">
                      {new Date(delivery.deliveryDate).toLocaleDateString()}
                    </p>
                    <div className="space-y-1">
                      {delivery.rawMaterials.map((rm, rmIndex) => (
                        <div key={rmIndex} className="text-xs text-gray-700">
                          <span className="font-medium">{rm.rawMaterialsName}:</span> {rm.deliveredQty} {rm.unit} (Lot: {rm.lotNo})
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const hasAnyChanges = docNoChange || supplierIdChange || supplierNameChange || poDateChange || poStatusChange ||
    JSON.stringify(purchaseOrderData?.purchaseOrderDetails) !== JSON.stringify(forApprovalVersion?.purchaseOrderDetails) ||
    JSON.stringify(purchaseOrderData?.deliveredPurchaseOrderDetails) !== JSON.stringify(forApprovalVersion?.deliveredPurchaseOrderDetails);

  return (
    <div className="space-y-6">
      {/* For Deletion Banner */}
      {isForDeletion && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Deletion Request
          </h3>
          <p className="text-sm text-red-700">
            This purchase order has been marked for deletion and is awaiting approval.
          </p>
        </div>
      )}

      {/* Change Reason */}
      {forApprovalVersion?.changeReason && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Change Reason</h4>
          <p className="text-sm text-blue-700">{forApprovalVersion.changeReason}</p>
        </div>
      )}

      {/* Field Changes */}
      {!isForDeletion && hasAnyChanges && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Proposed Changes</h3>

          {docNoChange && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Document No</h4>
              {renderFieldComparison('Document No', docNoChange)}
            </div>
          )}

          {supplierNameChange && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Supplier</h4>
              {renderFieldComparison('Supplier', supplierNameChange)}
            </div>
          )}

          {poDateChange && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">PO Date</h4>
              {renderFieldComparison('PO Date', {
                originalValue: poDateChange.originalValue ? new Date(poDateChange.originalValue).toLocaleDateString() : '(empty)',
                proposedValue: poDateChange.proposedValue ? new Date(poDateChange.proposedValue).toLocaleDateString() : '(empty)',
              })}
            </div>
          )}

          {poStatusChange && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">PO Status</h4>
              {renderFieldComparison('PO Status', poStatusChange)}
            </div>
          )}

          {renderOrderItemsComparison()}
          {renderDeliveriesComparison()}
        </div>
      )}

      {!isForDeletion && !hasAnyChanges && (
        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-500">No changes detected in the approval version.</p>
        </div>
      )}

      {/* Approval Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        <button
          onClick={onDeny}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-8 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Processing...' : 'Deny'}
        </button>
        <button
          onClick={onApprove}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-8 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Processing...' : 'Approve'}
        </button>
      </div>
    </div>
  );
}
