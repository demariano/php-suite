'use client';

import { ProductCategoryDto, StatusEnum } from '@data-access/index';
import CategoryForm from './CategoryForm';

interface CategoryModalProps {
  show: boolean;
  isCreateMode: boolean;
  selectedCategory: ProductCategoryDto | null;
  activeTab: 'details' | 'approval' | 'logs';
  successMessage: string | null;
  isAdminUser: boolean;
  isLoading: boolean;
  onClose: () => void;
  onTabChange: (tab: 'details' | 'approval' | 'logs') => void;
  onSave: (category: ProductCategoryDto) => void;
  onDelete: () => void;
  onApprove: () => void;
  onDeny: () => void;
}

export default function CategoryModal({
  show,
  isCreateMode,
  selectedCategory,
  activeTab,
  successMessage,
  isAdminUser,
  isLoading,
  onClose,
  onTabChange,
  onSave,
  onDelete,
  onApprove,
  onDeny
}: CategoryModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 m-0">
            {isCreateMode ? 'Create Category' : 'Edit Category'}
          </h2>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-2xl cursor-pointer text-gray-500 p-1 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-5">
          <button
            onClick={() => onTabChange('details')}
            className={`px-4 py-2.5 bg-transparent border-none cursor-pointer text-sm transition-colors duration-200 ${
              activeTab === 'details' 
                ? 'text-gray-800 font-semibold border-b-2 border-gray-800 -mb-px' 
                : 'text-gray-500 font-normal hover:text-gray-700'
            }`}
          >
            Details
          </button>
          
          {!isCreateMode && selectedCategory && (
            <button
              onClick={() => onTabChange('approval')}
              className={`px-4 py-2.5 bg-transparent border-none cursor-pointer text-sm transition-colors duration-200 ${
                activeTab === 'approval' 
                  ? 'text-gray-800 font-semibold border-b-2 border-gray-800 -mb-px' 
                  : 'text-gray-500 font-normal hover:text-gray-700'
              }`}
            >
              Approval Version
            </button>
          )}
          
          {!isCreateMode && (
            <button
              onClick={() => onTabChange('logs')}
              className={`px-4 py-2.5 bg-transparent border-none cursor-pointer text-sm transition-colors duration-200 ${
                activeTab === 'logs' 
                  ? 'text-gray-800 font-semibold border-b-2 border-gray-800 -mb-px' 
                  : 'text-gray-500 font-normal hover:text-gray-700'
              }`}
            >
              Activity Logs
            </button>
          )}
        </div>
        
        {/* Tab Content */}
        <div>
          {/* Details Tab */}
          {activeTab === 'details' && (
            <CategoryForm
              isCreateMode={isCreateMode}
              selectedCategory={selectedCategory}
              successMessage={successMessage}
              onSave={onSave}
              onDelete={onDelete}
              onCancel={onClose}
            />
          )}
          
          {/* Approval Version Tab */}
          {activeTab === 'approval' && !isCreateMode && selectedCategory && (
            <div>
              <div className="mb-5">
                {(selectedCategory.status === StatusEnum.FOR_APPROVAL || selectedCategory.status === StatusEnum.NEW_RECORD) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-center gap-2">
                    <span className="text-yellow-600 text-base">ℹ️</span>
                    <span className="text-yellow-800 text-sm">
                      These are the proposed changes awaiting approval
                    </span>
                  </div>
                )}
                
                {selectedCategory?.forApprovalVersion ? (
                  <div>
                    {/* Product Category Name */}
                    {selectedCategory.forApprovalVersion.productCategoryName !== undefined && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category Name
                        </label>
                        <input
                          type="text"
                          value={String(selectedCategory.forApprovalVersion.productCategoryName)}
                          readOnly
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm outline-none bg-gray-50"
                        />
                      </div>
                    )}
                    
                    {/* Status */}
                    {selectedCategory.forApprovalVersion.status !== undefined && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Status
                        </label>
                        <input
                          type="text"
                          value={String(selectedCategory.forApprovalVersion.status)}
                          readOnly
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm outline-none bg-gray-50"
                        />
                      </div>
                    )}
                    
                    {/* Other fields that might be in forApprovalVersion */}
                    {Object.entries(selectedCategory.forApprovalVersion).map(([key, value]) => {
                      // Skip the fields we've already handled
                      if (key === 'productCategoryName' || key === 'status') {
                        return null;
                      }
                      
                      return (
                        <div key={key} className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {/* Convert camelCase to Title Case */}
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </label>
                          <input
                            type="text"
                            value={String(value)}
                            readOnly
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm outline-none bg-gray-50"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">
                    No pending approval changes
                  </p>
                )}
              </div>
              
              <div className="flex justify-between mt-6">
                {/* Approve/Deny buttons for admin users when status is FOR_APPROVAL or NEW_RECORD */}
                {isAdminUser && (selectedCategory?.status === StatusEnum.FOR_APPROVAL || selectedCategory?.status === StatusEnum.NEW_RECORD || selectedCategory?.status === StatusEnum.FOR_DELETION) && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onDeny}
                      disabled={isLoading}
                      className="px-5 py-2.5 bg-transparent text-red-600 border border-red-600 rounded-md cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Processing...' : 'Deny Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={onApprove}
                      disabled={isLoading}
                      className="px-5 py-2.5 bg-green-600 text-white border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Processing...' : 'Approve Changes'}
                    </button>
                  </div>
                )}
                
                {/* Close button */}
                <div className={isAdminUser ? 'ml-auto' : ''}>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Activity Logs Tab */}
          {activeTab === 'logs' && !isCreateMode && (
            <div>
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  Recent Activity
                </h3>
                {selectedCategory?.activityLogs && selectedCategory.activityLogs.length > 0 ? (
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-72 overflow-y-auto">
                    {selectedCategory.activityLogs.map((log, index) => (
                      <div 
                        key={index} 
                        className={`py-2 ${
                          index < selectedCategory.activityLogs!.length - 1 ? 'border-b border-gray-200' : ''
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">
                    No activity logs available
                  </p>
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
