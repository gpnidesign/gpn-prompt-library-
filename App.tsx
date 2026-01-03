
import React, { useState, useMemo, useEffect } from 'react';
import { PromptEntry } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { PromptModal } from './components/PromptModal';
import { PromptCard } from './components/PromptCard';
import { Pagination } from './components/Pagination';
import { Sidebar } from './components/Sidebar';
import { PlusIcon, SearchIcon, TrashIcon, XIcon, MenuIcon, ChevronDownIcon, DocumentIcon, DownloadIcon, UploadIcon, TableIcon } from './components/icons';
import { generateBulkPDF, generatePDF } from './utils/pdfGenerator';
import { exportToExcelWithImages, importFromExcel, loadImagesFromFolder, matchImagesToPrompts } from './utils/storageManager';

const ITEMS_PER_PAGE = 12;

const App: React.FC = () => {
  const [prompts, setPrompts] = useLocalStorage<PromptEntry[]>('gpn-prompt-library', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptEntry | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState<'all' | 'favorites' | 'report'>('all');

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    prompts.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [prompts]);

  const favoritesCount = useMemo(() => {
    return prompts.filter(p => p.isFavorite).length;
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    return prompts
      .filter(p => {
        // Filter by view (all or favorites)
        if (currentView === 'favorites' && !p.isFavorite) {
          return false;
        }

        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          p.prompt.toLowerCase().includes(searchLower) ||
          (p.model && p.model.toLowerCase().includes(searchLower)) ||
          p.tags.some(t => t.toLowerCase().includes(searchLower));

        const matchesTags = selectedTags.size === 0 || p.tags.some(t => selectedTags.has(t));

        return matchesSearch && matchesTags;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [prompts, searchTerm, selectedTags, currentView]);

  const totalPages = Math.ceil(filteredPrompts.length / ITEMS_PER_PAGE);

  const paginatedPrompts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPrompts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPrompts, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage === 0 && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);


  const handleOpenModal = (entry: PromptEntry | null = null) => {
    setEditingPrompt(entry);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPrompt(null);
  };

  const handleSavePrompt = (entry: PromptEntry) => {
    setPrompts(prev => {
      const existingIndex = prev.findIndex(p => p.id === entry.id);
      if (existingIndex > -1) {
        const newPrompts = [...prev];
        newPrompts[existingIndex] = entry;
        return newPrompts;
      }
      return [entry, ...prev];
    });
  };

  const handleDeletePrompt = (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      setPrompts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
    setCurrentPage(1);
  };

  const handleSelectPrompt = (id: string, isSelected: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size > 0 && window.confirm(`Are you sure you want to delete ${selectedIds.size} selected entries?`)) {
      setPrompts(prev => prev.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    }
  };

  const handleToggleFavorite = (id: string) => {
    setPrompts(prev => prev.map(p =>
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  };

  const handleViewChange = (view: 'all' | 'favorites' | 'report') => {
    setCurrentView(view);
    setCurrentPage(1);
  };

  const handleToggleExpanded = (id: string, isExpanded: boolean) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleExportSelected = () => {
    const selectedPrompts = prompts.filter(p => selectedIds.has(p.id));
    if (selectedPrompts.length === 0) return;

    if (selectedPrompts.length === 1) {
      generatePDF(selectedPrompts[0]);
    } else {
      generateBulkPDF(selectedPrompts);
    }
  };

  const handleExportAll = () => {
    if (filteredPrompts.length === 0) return;

    if (filteredPrompts.length === 1) {
      generatePDF(filteredPrompts[0]);
    } else {
      generateBulkPDF(filteredPrompts);
    }
  };

  const handleExportToExcel = async () => {
    try {
      await exportToExcelWithImages(prompts);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleImportFromExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const importedPrompts = await importFromExcel(file);

        // Ask user if they want to load images from DATA folder
        if (window.confirm('Data imported successfully! Do you want to load images from a DATA folder?')) {
          const folderInput = document.createElement('input');
          folderInput.type = 'file';
          folderInput.webkitdirectory = true;
          folderInput.multiple = true;
          folderInput.onchange = async (e2) => {
            const files = (e2.target as HTMLInputElement).files;
            if (!files) return;

            try {
              const imageMap = await loadImagesFromFolder(files);
              const promptsWithImages = matchImagesToPrompts(importedPrompts, imageMap);
              setPrompts(promptsWithImages);
              alert(`Successfully imported ${promptsWithImages.length} prompts with images!`);
            } catch (error) {
              console.error('Error loading images:', error);
              setPrompts(importedPrompts);
              alert(`Imported ${importedPrompts.length} prompts (images could not be loaded).`);
            }
          };
          folderInput.click();
        } else {
          setPrompts(importedPrompts);
          alert(`Successfully imported ${importedPrompts.length} prompts!`);
        }
      } catch (error) {
        console.error('Error importing from Excel:', error);
        alert('Failed to import data. Please check the file format.');
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        totalPrompts={prompts.length}
        favoritesCount={favoritesCount}
        allTags={allTags}
        selectedTags={selectedTags}
        onTagToggle={handleTagToggle}
        onClearTags={() => setSelectedTags(new Set())}
        currentView={currentView}
        onViewChange={handleViewChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <div className="sticky top-0 bg-white/95 backdrop-blur-lg z-10 p-4 border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <MenuIcon className="h-6 w-6" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">GPN Prompt Library</h1>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {selectedIds.size > 0 && currentView !== 'report' && (
                  <>
                    <button
                      onClick={handleExportSelected}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-all shadow-sm"
                    >
                      <DocumentIcon className="h-4 w-4" />
                      Export PDF ({selectedIds.size})
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <XIcon className="h-4 w-4" />
                      Clear Selection
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all shadow-sm"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete ({selectedIds.size})
                    </button>
                  </>
                )}
                {expandedIds.size > 0 && currentView !== 'report' && (
                  <button
                    onClick={handleCollapseAll}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <ChevronDownIcon className="h-4 w-4" />
                    Collapse All Prompts
                  </button>
                )}
                {currentView !== 'report' && (
                  <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add Entry
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search prompts, models, or tags..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-10 pr-4 text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
              {allTags.length > 0 && (
                <div className="flex-shrink-0 flex items-center gap-2 overflow-x-auto pb-2">
                  <span className="text-sm font-medium text-gray-600">Filter by Tag:</span>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-all whitespace-nowrap ${selectedTags.has(tag) ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                  {selectedTags.size > 0 && (
                    <button onClick={() => setSelectedTags(new Set())} className="text-gray-500 hover:text-gray-700"><XIcon className="w-5 h-5" /></button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          {currentView === 'report' ? (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Report & Export</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Export Data</h3>

                    <button
                      onClick={handleExportToExcel}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 text-base font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
                    >
                      <DownloadIcon className="h-5 w-5" />
                      Export Excel + Images
                    </button>
                    <p className="text-sm text-gray-500 pl-2">
                      Export all prompts to Excel with images saved in DATA folder. Images are embedded in cells and also saved separately.
                    </p>

                    <button
                      onClick={handleExportAll}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                    >
                      <DocumentIcon className="h-5 w-5" />
                      Export All to PDF
                    </button>
                    <p className="text-sm text-gray-500 pl-2">
                      Export all prompts to a single PDF document with detailed formatting and images.
                    </p>
                  </div>

                  {/* Import Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Import Data</h3>

                    <button
                      onClick={handleImportFromExcel}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 text-base font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-all shadow-md hover:shadow-lg"
                    >
                      <UploadIcon className="h-5 w-5" />
                      Import from Excel
                    </button>
                    <p className="text-sm text-gray-500 pl-2">
                      Import prompts from an Excel file. You'll be prompted to load images from the DATA folder after import.
                    </p>
                  </div>
                </div>

                {/* Statistics Section */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Library Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-blue-600 font-medium">Total Prompts</p>
                      <p className="text-3xl font-bold text-blue-700 mt-1">{prompts.length}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <p className="text-sm text-red-600 font-medium">Favorites</p>
                      <p className="text-3xl font-bold text-red-700 mt-1">{favoritesCount}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-green-600 font-medium">Total Tags</p>
                      <p className="text-3xl font-bold text-green-700 mt-1">{allTags.length}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="text-sm text-purple-600 font-medium">With Images</p>
                      <p className="text-3xl font-bold text-purple-700 mt-1">
                        {prompts.filter(p => p.beforeImage || p.afterImage).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {filteredPrompts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedPrompts.map(entry => (
                      <PromptCard
                        key={entry.id}
                        entry={entry}
                        onEdit={handleOpenModal}
                        onDelete={handleDeletePrompt}
                        onSelect={handleSelectPrompt}
                        isSelected={selectedIds.has(entry.id)}
                        onToggleFavorite={handleToggleFavorite}
                        isExpanded={expandedIds.has(entry.id)}
                        onToggleExpanded={handleToggleExpanded}
                      />
                    ))}
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </>
              ) : (
                <div className="text-center py-20">
                  <h2 className="text-xl font-semibold text-gray-600">No entries found.</h2>
                  <p className="text-gray-500 mt-2">
                    {prompts.length > 0 ? "Try adjusting your search or filters." : "Click 'Add Entry' to get started!"}
                  </p>
                </div>
              )}
            </>
          )}
        </main>

        <PromptModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSavePrompt}
          initialData={editingPrompt}
        />
      </div>
    </div>
  );
};

export default App;
