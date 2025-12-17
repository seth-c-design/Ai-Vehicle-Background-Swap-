import React, { useState, useCallback, useRef } from 'react';
import type { FileInfo } from '../types';
import UploadIcon from './icons/UploadIcon';

interface ImageUploaderProps {
  onImageUpload: (fileInfo: FileInfo) => void;
  title: string;
  description: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, title, description }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;

        const img = new Image();
        img.onload = () => {
          onImageUpload({
            name: file.name,
            type: file.type,
            size: file.size,
            base64,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };
  
  return (
    <div
      className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer h-full transition-colors duration-200 ease-in-out
        ${isDragging ? 'border-blue-500 bg-gray-700' : 'border-gray-600 hover:border-blue-400 bg-gray-800'}
      `}
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <UploadIcon className="w-10 h-10 text-gray-400 mb-3" />
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400 text-center">{description}</p>
    </div>
  );
};

export default ImageUploader;
