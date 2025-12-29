'use client';

import { RawMaterialsPurchaseOrderApi } from '@web-app/apis/raw-materials-purchase-order/raw-materials-purchase-order.api';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    ApprovalTab,
    DeliveriesTab,
    DenyReasonDialog,
    LogsTab,
    PurchaseOrderDetailsTab,
} from './components';

type TabType = 'details' | 'deliveries' | 'approval' | 'logs';

export default function EditRawMaterialsPurchaseOrderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [purchaseOrderData, setPurchaseOrderData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDenyDialogOpen, setIsDenyDialogOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchaseOrder();
    checkUserRole();
  }, [id]);

  useEffect(() => {
    // Auto-switch to approval tab if status requires approval and user is admin
    if (purchaseOrderData) {
      const status = purchaseOrderData.status;
      if ((status === 'FOR_APPROVAL' || status === 'FOR_DELETION') && isAdminUser) {
        setActiveTab('approval');
      }
    }
  }, [purchaseOrderData, isAdminUser]);

  const checkUserRole = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setIsAdminUser(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
      }
    } catch (error) {
      console.error('Failed to check user role:', error);
    }
  };

  const fetchPurchaseOrder = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await RawMaterialsPurchaseOrderApi.getRawMaterialsPurchaseOrder(id);
      setPurchaseOrderData(response.data);
    } catch (error: any) {
      console.error('Failed to fetch purchase order:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load purchase order.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDetails = async (formData: any) => {
    setIsSubmitting(true);
    try {
      await RawMaterialsPurchaseOrderApi.updateRawMaterialsPurchaseOrder(id, formData);
      alert('Purchase order updated successfully!');
      await fetchPurchaseOrder();
    } catch (error: any) {
      console.error('Failed to update purchase order:', error);
      alert(error.response?.data?.message || 'Failed to update purchase order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransitionToPending = async () => {
    if (!confirm('Are you sure you want to mark this purchase order as PENDING?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await RawMaterialsPurchaseOrderApi.transitionSystemGeneratedToPending(id);
      alert('Purchase order status updated to PENDING!');
      await fetchPurchaseOrder();
    } catch (error: any) {
      console.error('Failed to transition status:', error);
      alert(error.response?.data?.message || 'Failed to update status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDelivery = async (deliveryData: any) => {
    setIsSubmitting(true);
    try {
      await RawMaterialsPurchaseOrderApi.addIncomingDelivery(id, deliveryData);
      alert('Delivery recorded successfully!');
      await fetchPurchaseOrder();
    } catch (error: any) {
      console.error('Failed to add delivery:', error);
      alert(error.response?.data?.message || 'Failed to record delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDelivery = async (deliveryDate: string) => {
    setIsSubmitting(true);
    try {
      await RawMaterialsPurchaseOrderApi.deleteDelivery(id, { deliveryDate });
      alert('Delivery deleted successfully!');
      await fetchPurchaseOrder();
    } catch (error: any) {
      console.error('Failed to delete delivery:', error);
      alert(error.response?.data?.message || 'Failed to delete delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this purchase order?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await RawMaterialsPurchaseOrderApi.approvePurchaseOrder(id);
      alert('Purchase order approved successfully!');
      await fetchPurchaseOrder();
    } catch (error: any) {
      console.error('Failed to approve purchase order:', error);
      alert(error.response?.data?.message || 'Failed to approve purchase order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeny = () => {
    setIsDenyDialogOpen(true);
  };

  const handleDenySubmit = async (approverMessage: string) => {
    setIsSubmitting(true);
    try {
      await RawMaterialsPurchaseOrderApi.denyPurchaseOrder(id, { approverMessage });
      alert('Purchase order denied successfully!');
      setIsDenyDialogOpen(false);
      await fetchPurchaseOrder();
    } catch (error: any) {
      console.error('Failed to deny purchase order:', error);
      alert(error.response?.data?.message || 'Failed to deny purchase order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTabColor = (tab: TabType): string => {
    if (activeTab === tab) {
      const status = purchaseOrderData?.status;
      if (status === 'FOR_APPROVAL' || status === 'FOR_DELETION') {
        return 'border-yellow-500 bg-yellow-50 text-yellow-700';
      }
      return 'border-blue-500 bg-blue-50 text-blue-700';
    }
    return 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50';
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
      FOR_APPROVAL: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'For Approval' },
      FOR_DELETION: { bg: 'bg-red-100', text: 'text-red-700', label: 'For Deletion' },
      NEW_RECORD: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'New Record' },
    };

    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };

    return (
      <span className={`inline-flex items-center rounded-full ${badge.bg} px-3 py-1 text-xs font-semibold ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getPoStatusBadge = (poStatus: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      SYSTEM_GENERATED: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'System Generated' },
      PENDING: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
      PARTIAL: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Partial' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    };

    const badge = badges[poStatus] || { bg: 'bg-gray-100', text: 'text-gray-700', label: poStatus };

    return (
      <span className={`inline-flex items-center rounded-full ${badge.bg} px-3 py-1 text-xs font-semibold ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-600">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  if (!purchaseOrderData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Purchase order not found.</p>
        </div>
      </div>
    );
  }

  const hasDeliveries = (purchaseOrderData.deliveredPurchaseOrderDetails || []).length > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/inventory/raw-materials-purchase-order')}
              className="flex items-center justify-center rounded-xl border-2 border-gray-300 bg-white p-2 text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Purchase Order: {purchaseOrderData.docNo || 'N/A'}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                {getStatusBadge(purchaseOrderData.status)}
                {getPoStatusBadge(purchaseOrderData.poStatus)}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`rounded-t-xl border-2 border-b-0 px-6 py-3 font-semibold transition-all duration-200 ${getTabColor('details')}`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`rounded-t-xl border-2 border-b-0 px-6 py-3 font-semibold transition-all duration-200 ${getTabColor('deliveries')}`}
          >
            Deliveries
          </button>
          <button
            onClick={() => setActiveTab('approval')}
            className={`rounded-t-xl border-2 border-b-0 px-6 py-3 font-semibold transition-all duration-200 ${getTabColor('approval')}`}
          >
            Approval
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`rounded-t-xl border-2 border-b-0 px-6 py-3 font-semibold transition-all duration-200 ${getTabColor('logs')}`}
          >
            Logs
          </button>
        </div>

        {/* Tab Content */}
        <div className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm">
          {activeTab === 'details' && (
            <PurchaseOrderDetailsTab
              purchaseOrderData={purchaseOrderData}
              hasDeliveries={hasDeliveries}
              status={purchaseOrderData.status}
              poStatus={purchaseOrderData.poStatus}
              isAdminUser={isAdminUser}
              onUpdate={handleUpdateDetails}
              onTransitionToPending={handleTransitionToPending}
              isSubmitting={isSubmitting}
            />
          )}

          {activeTab === 'deliveries' && (
            <DeliveriesTab
              purchaseOrderData={purchaseOrderData}
              status={purchaseOrderData.status}
              onAddDelivery={handleAddDelivery}
              onDeleteDelivery={handleDeleteDelivery}
              isSubmitting={isSubmitting}
            />
          )}

          {activeTab === 'approval' && (
            <ApprovalTab
              purchaseOrderData={purchaseOrderData}
              status={purchaseOrderData.status}
              onApprove={handleApprove}
              onDeny={handleDeny}
              isSubmitting={isSubmitting}
            />
          )}

          {activeTab === 'logs' && (
            <LogsTab activities={purchaseOrderData.activities || []} />
          )}
        </div>
      </div>

      {/* Deny Dialog */}
      <DenyReasonDialog
        isOpen={isDenyDialogOpen}
        onClose={() => setIsDenyDialogOpen(false)}
        onSubmit={handleDenySubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
