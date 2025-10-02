'use client';

interface CategoryHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onCreateClick: () => void;
}

export default function CategoryHeader({
  searchTerm,
  onSearchChange,
  onRefresh,
  onCreateClick
}: CategoryHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Categories
      </h1>

      {/* Search and Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-3 items-center">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm w-72 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-shadow duration-200"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              🔍
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="px-3 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg cursor-pointer text-lg flex items-center justify-center transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md"
            title="Refresh"
          >
            ↻
          </button>
        </div>

        {/* Add Category Button */}
        <button 
          onClick={onCreateClick}
          className="px-4 py-2.5 bg-blue-600 text-white border-none rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1.5 hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          <span className="text-lg">+</span>
          Add Category
        </button>
      </div>
    </div>
  );
}
