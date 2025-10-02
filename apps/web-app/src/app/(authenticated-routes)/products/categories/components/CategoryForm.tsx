'use client';

import { ProductCategoryDto, StatusEnum } from '@data-access/index';

interface CategoryFormProps {
  isCreateMode: boolean;
  selectedCategory: ProductCategoryDto | null;
  successMessage: string | null;
  onSave: (category: ProductCategoryDto) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function CategoryForm({
  isCreateMode,
  selectedCategory,
  successMessage,
  onSave,
  onDelete,
  onCancel
}: CategoryFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const categoryName = formData.get('productCategoryName') as string;
    
    if (isCreateMode) {
      const newCategory = {
        productCategoryName: categoryName,
        status: StatusEnum.ACTIVE // Default status for new categories
      };
      onSave(newCategory as ProductCategoryDto);
    } else {
      const updatedCategory = {
        ...selectedCategory,
        productCategoryName: categoryName,
        status: StatusEnum.ACTIVE
      };
      onSave(updatedCategory as ProductCategoryDto);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Success message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4 flex items-center gap-2">
          <span className="text-green-600 text-base">✓</span>
          <span className="text-green-800 text-sm">
            {successMessage}
          </span>
        </div>
      )}
      
      {/* Pending approval or deletion warning */}
      {!isCreateMode && selectedCategory && 
       (selectedCategory.status === StatusEnum.FOR_APPROVAL || selectedCategory.status === StatusEnum.NEW_RECORD || selectedCategory.status === StatusEnum.FOR_DELETION) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-center gap-2">
          <span className="text-yellow-600 text-base">⚠️</span>
          <span className="text-yellow-800 text-sm">
            {selectedCategory.status === StatusEnum.FOR_DELETION 
              ? 'This record is pending deletion. Editing and deletion are disabled until the record is processed.'
              : 'This record is pending approval. Editing and deletion are disabled until the record is approved or denied.'}
          </span>
        </div>
      )}
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category Name
        </label>
        <input
          type="text"
          name="productCategoryName"
          defaultValue={isCreateMode ? '' : selectedCategory?.productCategoryName || ''}
          placeholder={isCreateMode ? 'Enter category name' : ''}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      
      {!isCreateMode && selectedCategory && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-gray-50">
            {selectedCategory.status || 'ACTIVE'}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mt-6">
        {!isCreateMode && (
          <button
            type="button"
            onClick={onDelete}
            disabled={selectedCategory?.status !== StatusEnum.ACTIVE}
            className={`px-5 py-2.5 border rounded-md text-sm font-medium transition-all duration-200 ${
              selectedCategory?.status !== StatusEnum.ACTIVE
                ? 'bg-transparent text-gray-400 border-gray-300 cursor-not-allowed opacity-50'
                : 'bg-transparent text-red-600 border-red-600 cursor-pointer hover:bg-red-50'
            }`}
          >
            Delete
          </button>
        )}
        
        <div className="flex gap-3 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-transparent text-gray-600 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isCreateMode && selectedCategory?.status !== StatusEnum.ACTIVE}
            className={`px-5 py-2.5 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-200 ${
              (!isCreateMode && selectedCategory?.status !== StatusEnum.ACTIVE)
                ? 'bg-gray-400 text-white cursor-not-allowed opacity-70'
                : 'bg-gray-800 text-white hover:bg-gray-900'
            }`}
          >
            {isCreateMode ? 'Create Category' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
