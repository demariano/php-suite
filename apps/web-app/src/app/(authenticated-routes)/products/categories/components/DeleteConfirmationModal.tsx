'use client';

import { ProductCategoryDto } from '@data-access/index';

interface DeleteConfirmationModalProps {
  show: boolean;
  category: ProductCategoryDto | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({ 
  show, 
  category, 
  onConfirm, 
  onCancel 
}: DeleteConfirmationModalProps) {
  if (!show || !category) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mr-3">
            <span className="text-xl text-red-600">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 m-0">
            Delete Category
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Are you sure you want to delete <strong>&quot;{category.productCategoryName}&quot;</strong>? 
          This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 bg-red-600 text-white border-none rounded-md cursor-pointer text-sm font-medium hover:bg-red-700 transition-colors duration-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
