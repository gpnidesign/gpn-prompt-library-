
import React, { useState } from 'react';
import { PromptEntry } from '../types';
import { PencilIcon, TrashIcon, CopyIcon, CheckIcon, ChevronDownIcon, HeartIcon, DocumentIcon } from './icons';
import { ImageViewer } from './ImageViewer';
import { generatePDF } from '../utils/pdfGenerator';

interface PromptCardProps {
  entry: PromptEntry;
  onEdit: (entry: PromptEntry) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string, isSelected: boolean) => void;
  isSelected: boolean;
  onToggleFavorite: (id: string) => void;
  isExpanded: boolean;
  onToggleExpanded: (id: string, isExpanded: boolean) => void;
}

const ImageDisplay: React.FC<{ src?: string; alt: string; onClick?: () => void }> = ({ src, alt, onClick }) => {
  const [imageInfo, setImageInfo] = React.useState<{ width: number; height: number; fileSize: string } | null>(null);

  React.useEffect(() => {
    if (src) {
      const img = new Image();
      img.onload = () => {
        const base64Length = src.replace(/^data:image\/\w+;base64,/, '').length;
        const sizeInBytes = (base64Length * 3) / 4;

        let fileSize: string;
        if (sizeInBytes < 1024) {
          fileSize = `${sizeInBytes.toFixed(0)} B`;
        } else if (sizeInBytes < 1024 * 1024) {
          fileSize = `${(sizeInBytes / 1024).toFixed(2)} KB`;
        } else {
          fileSize = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
        }

        setImageInfo({
          width: img.width,
          height: img.height,
          fileSize
        });
      };
      img.src = src;
    }
  }, [src]);

  return (
    <div className="w-1/2 aspect-square bg-gray-100 flex flex-col relative overflow-hidden group cursor-pointer">
      <div className="flex-1 flex items-center justify-center" onClick={onClick}>
        {src ? (
          <img
            src={src}
            alt={alt}
            className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="text-gray-400 text-sm">No Image</div>
        )}
      </div>
      {imageInfo && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-white text-xs py-1.5 px-2 flex justify-between items-center">
          <span className="font-medium">{imageInfo.width} × {imageInfo.height}</span>
          <span className="font-medium">{imageInfo.fileSize}</span>
        </div>
      )}
    </div>
  );
};

export const PromptCard: React.FC<PromptCardProps> = ({ entry, onEdit, onDelete, onSelect, isSelected, onToggleFavorite, isExpanded, onToggleExpanded }) => {
  const [copied, setCopied] = useState(false);
  const [viewerImage, setViewerImage] = useState<{ url: string; title: string } | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  return (
    <div className={`bg-white rounded-xl overflow-hidden shadow-md border border-gray-200 transition-all duration-300 hover:shadow-lg ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="relative">
        <div className="flex">
          <ImageDisplay
            src={entry.beforeImage}
            alt="Before"
            onClick={() => entry.beforeImage && setViewerImage({ url: entry.beforeImage!, title: 'Before Image' })}
          />
          <div className="border-l border-gray-200" />
          <ImageDisplay
            src={entry.afterImage}
            alt="After"
            onClick={() => entry.afterImage && setViewerImage({ url: entry.afterImage!, title: 'After Image' })}
          />
        </div>
        <div className="absolute top-2 left-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(entry.id, e.target.checked)}
              className="h-5 w-5 rounded bg-white/90 border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-2 cursor-pointer shadow-sm"
            />
        </div>
        <div className="absolute top-2 right-2">
            <button
              onClick={() => onToggleFavorite(entry.id)}
              className={`p-2 rounded-full backdrop-blur-sm transition-all shadow-sm ${
                entry.isFavorite
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white'
              }`}
              aria-label={entry.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <HeartIcon className="h-5 w-5" filled={entry.isFavorite} />
            </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
             <button onClick={() => onToggleExpanded(entry.id, !isExpanded)} className="w-full text-left flex justify-between items-center text-gray-600 hover:text-gray-800 mb-2">
                <span className="font-semibold text-sm">Prompt</span>
                <ChevronDownIcon className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
             </button>
             <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
                <div className="relative bg-gray-50 border border-gray-200 rounded-lg mt-1 mb-3">
                   <button onClick={handleCopy} className="absolute top-2 right-2 z-10 p-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-100 transition-colors shadow-sm">
                     {copied ? <CheckIcon className="h-4 w-4 text-green-600" /> : <CopyIcon className="h-4 w-4 text-gray-500" />}
                   </button>
                   <div className="max-h-80 overflow-y-auto p-3">
                     <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono break-words pr-8">{entry.prompt}</pre>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-3">
           {entry.model && (
             <div className="text-xs">
                <span className="font-bold text-gray-500 mr-2">Model:</span>
                <span className="text-gray-700">{entry.model}</span>
             </div>
           )}

           {entry.parameters.length > 0 && (
             <div className="text-xs">
                 <span className="font-bold text-gray-500 mr-2">Params:</span>
                 <div className="flex flex-wrap gap-1 mt-1">
                    {entry.parameters.map(p => (
                      <span key={p.id} className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-gray-700">
                        <span className="font-semibold">{p.key}:</span> {p.value}
                      </span>
                    ))}
                 </div>
             </div>
           )}

            {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {entry.tags.map(tag => (
                        <span key={tag} className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-2 py-1 rounded-full">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>

        <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">{formatDate(entry.createdAt)}</p>
            <div className="flex gap-2">
                <button onClick={() => generatePDF(entry)} className="p-2 text-gray-500 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors" aria-label="Export to PDF" title="Export to PDF">
                    <DocumentIcon className="h-5 w-5" />
                </button>
                <button onClick={() => onEdit(entry)} className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" aria-label="Edit">
                    <PencilIcon className="h-5 w-5" />
                </button>
                <button onClick={() => onDelete(entry.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" aria-label="Delete">
                    <TrashIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
      </div>

      {viewerImage && (
        <ImageViewer
          isOpen={!!viewerImage}
          imageUrl={viewerImage.url}
          title={viewerImage.title}
          onClose={() => setViewerImage(null)}
        />
      )}
    </div>
  );
};
