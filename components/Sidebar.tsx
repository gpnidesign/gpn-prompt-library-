import React from 'react';
import { HomeIcon, BookmarkIcon, TagIcon, CollectionIcon, XIcon, ReportIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  totalPrompts: number;
  favoritesCount: number;
  allTags: string[];
  selectedTags: Set<string>;
  onTagToggle: (tag: string) => void;
  onClearTags: () => void;
  currentView: 'all' | 'favorites' | 'report';
  onViewChange: (view: 'all' | 'favorites' | 'report') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  totalPrompts,
  favoritesCount,
  allTags,
  selectedTags,
  onTagToggle,
  onClearTags,
  currentView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 shadow-lg z-30 transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {!isCollapsed && <h2 className="text-lg font-semibold text-gray-800">Menu</h2>}
            <div className="flex items-center gap-2">
              {/* Desktop collapse toggle */}
              <button
                onClick={onToggleCollapse}
                className="hidden lg:block text-gray-500 hover:text-gray-700 transition-colors"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <ChevronRightIcon className="h-6 w-6" />
                ) : (
                  <ChevronLeftIcon className="h-6 w-6" />
                )}
              </button>
              {/* Mobile close button */}
              <button
                onClick={onClose}
                className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Main Navigation */}
              <div>
                {!isCollapsed && (
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Navigation
                  </h3>
                )}
                <div className="space-y-1">
                  <button
                    onClick={() => onViewChange('all')}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${currentView === 'all'
                        ? 'text-white bg-blue-600 shadow-sm'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? "All Prompts" : ""}
                  >
                    <HomeIcon className="h-5 w-5" />
                    {!isCollapsed && (
                      <>
                        <span>All Prompts</span>
                        <span className={`ml-auto text-xs px-2 py-1 rounded-full ${currentView === 'all' ? 'bg-blue-500' : 'bg-gray-200 text-gray-600'
                          }`}>
                          {totalPrompts}
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => onViewChange('favorites')}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${currentView === 'favorites'
                        ? 'text-white bg-blue-600 shadow-sm'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? "Favorites" : ""}
                  >
                    <BookmarkIcon className="h-5 w-5" />
                    {!isCollapsed && (
                      <>
                        <span>Favorites</span>
                        {favoritesCount > 0 && (
                          <span className={`ml-auto text-xs px-2 py-1 rounded-full ${currentView === 'favorites' ? 'bg-blue-500' : 'bg-gray-200 text-gray-600'
                            }`}>
                            {favoritesCount}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => onViewChange('report')}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${currentView === 'report'
                        ? 'text-white bg-blue-600 shadow-sm'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? "Report" : ""}
                  >
                    <ReportIcon className="h-5 w-5" />
                    {!isCollapsed && <span>Report</span>}
                  </button>
                  <button
                    className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all ${isCollapsed ? 'justify-center' : ''
                      }`}
                    title={isCollapsed ? "Collections" : ""}
                  >
                    <CollectionIcon className="h-5 w-5" />
                    {!isCollapsed && <span>Collections</span>}
                  </button>
                </div>
              </div>

              {/* Tags Section */}
              {!isCollapsed && allTags.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tags
                    </h3>
                    {selectedTags.size > 0 && (
                      <button
                        onClick={onClearTags}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => onTagToggle(tag)}
                        className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-all ${selectedTags.has(tag)
                            ? 'bg-blue-600 text-white font-medium shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                      >
                        <TagIcon className="h-4 w-4" />
                        <span className="truncate">{tag}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Footer */}
          {!isCollapsed && (
            <div className="border-t border-gray-200 bg-gray-50">
              <button
                onClick={onClose}
                className="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all border-b border-gray-200"
              >
                <XIcon className="h-5 w-5" />
                <span>Close Menu</span>
              </button>
              <div className="p-4">
                <div className="text-xs text-gray-500">
                  <p className="font-semibold text-gray-700">GPN Prompt Library</p>
                  <p className="mt-1">v1.0.0</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
