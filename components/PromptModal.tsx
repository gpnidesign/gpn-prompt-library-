
import React, { useState, useEffect, useCallback } from 'react';
import { PromptEntry, PromptParameter } from '../types';
import { PlusIcon, TrashIcon, XIcon } from './icons';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: PromptEntry) => void;
  initialData?: PromptEntry | null;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const ImageInput: React.FC<{
  label: string;
  image: string | undefined;
  onImageChange: (base64: string | undefined) => void;
}> = ({ label, image, onImageChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await fileToBase64(e.target.files[0]);
      onImageChange(base64);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Check for files
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        onImageChange(base64);
      }
      return;
    }

    // Check for URL from drag
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      loadImageFromUrl(url);
    }
  };

  const loadImageFromUrl = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const base64 = await fileToBase64(blob as File);
      onImageChange(base64);
      setShowUrlInput(false);
      setUrlInput('');
    } catch (error) {
      alert('Failed to load image from URL. Please try a different URL or upload a file.');
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      loadImageFromUrl(urlInput.trim());
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div
        className={`w-full h-48 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed relative overflow-hidden transition-all ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {image ? (
          <>
            <img src={image} alt={label} className="object-contain h-full w-full" />
            <button
              onClick={() => onImageChange(undefined)}
              className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors shadow-sm border border-gray-200"
              aria-label={`Remove ${label}`}
            >
              <XIcon className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="text-center text-gray-400 px-4">
            <p className="text-sm font-medium mb-2">
              {isDragging ? 'Drop image here' : 'Drag & drop image here'}
            </p>
            <p className="text-xs mb-3">or click to browse files</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUrlInput(!showUrlInput);
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {showUrlInput ? 'Cancel' : 'Or paste image URL'}
            </button>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {showUrlInput && !image && (
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            placeholder="https://example.com/image.jpg"
            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Load
          </button>
        </div>
      )}
    </div>
  );
};

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [prompt, setPrompt] = useState('');
  const [beforeImage, setBeforeImage] = useState<string | undefined>(undefined);
  const [afterImage, setAfterImage] = useState<string | undefined>(undefined);
  const [model, setModel] = useState('');
  const [parameters, setParameters] = useState<PromptParameter[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<{ prompt?: string; image?: string }>({});

  const resetState = useCallback(() => {
    setPrompt(initialData?.prompt ?? '');
    setBeforeImage(initialData?.beforeImage);
    setAfterImage(initialData?.afterImage);
    setModel(initialData?.model ?? '');
    setParameters(initialData?.parameters ?? []);
    setTags(initialData?.tags ?? []);
    setTagInput('');
    setErrors({});
  }, [initialData]);

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const addParameter = () => {
    setParameters([...parameters, { id: generateId(), key: '', value: '' }]);
  };

  const updateParameter = (id: string, field: 'key' | 'value', value: string) => {
    setParameters(parameters.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeParameter = (id: string) => {
    setParameters(parameters.filter(p => p.id !== id));
  };

  const handleSave = () => {
    const currentErrors: { prompt?: string; image?: string } = {};
    if (!prompt.trim()) {
      currentErrors.prompt = "Prompt is required.";
    }
    if (!beforeImage && !afterImage) {
      currentErrors.image = "At least one image (Before or After) is required.";
    }

    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    const finalTags = [...tags];
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
        finalTags.push(tagInput.trim());
    }

    const newEntry: PromptEntry = {
      id: initialData?.id || generateId(),
      prompt,
      beforeImage,
      afterImage,
      model,
      parameters: parameters.filter(p => p.key.trim() !== ''),
      tags: finalTags,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };
    onSave(newEntry);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">{initialData ? 'Edit Prompt Entry' : 'Add New Prompt Entry'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto">
          {errors.image && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{errors.image}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageInput label="Before Image" image={beforeImage} onImageChange={setBeforeImage} />
            <ImageInput label="After Image" image={afterImage} onImageChange={setAfterImage} />
          </div>

          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">Prompt</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={5}
              className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Enter your prompt here..."
            />
             {errors.prompt && <p className="text-red-600 text-sm mt-1">{errors.prompt}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">Model (optional)</label>
              <input
                type="text"
                id="model"
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="e.g., Stable Diffusion XL"
              />
            </div>
             <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">Tags (comma or enter to add)</label>
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-white border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center bg-blue-100 text-blue-700 text-sm font-medium px-2.5 py-1 rounded-full">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-1.5 text-blue-600 hover:text-blue-800">
                      <XIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  id="tags"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                  className="bg-transparent flex-1 focus:outline-none min-w-[100px] text-gray-700"
                  placeholder="Add a tag..."
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Parameters (optional)</h3>
            <div className="space-y-2">
              {parameters.map((param, index) => (
                <div key={param.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={param.key}
                    onChange={e => updateParameter(param.id, 'key', e.target.value)}
                    placeholder="Key (e.g., CFG)"
                    className="w-1/3 bg-white border border-gray-300 rounded-lg p-2.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                  <input
                    type="text"
                    value={param.value}
                    onChange={e => updateParameter(param.id, 'value', e.target.value)}
                    placeholder="Value (e.g., 7.5)"
                    className="flex-1 bg-white border border-gray-300 rounded-lg p-2.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                  <button onClick={() => removeParameter(param.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
             <button onClick={addParameter} className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
               <PlusIcon className="h-4 w-4" /> Add Parameter
             </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-medium">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all font-semibold shadow-sm">Save Entry</button>
        </div>
      </div>
    </div>
  );
};
