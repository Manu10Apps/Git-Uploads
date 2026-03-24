'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';

interface MediaUploaderProps {
  onUploadComplete: (url: string, filename: string) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  multiple?: boolean;
}

export default function MediaUploader({
  onUploadComplete,
  accept = { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'] },
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = false,
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ url: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);
      setUploading(true);

      try {
        for (const file of acceptedFiles) {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

          if (data.success) {
            const newFile = { url: data.url, name: file.name };
            setUploadedFiles((prev) => [...prev, newFile]);
            onUploadComplete(data.url, file.name);
          } else {
            setError(data.error || 'Upload failed');
          }
        }
      } catch (err) {
        setError('Network error during upload');
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
  });

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
            : 'border-neutral-300 dark:border-neutral-700 hover:border-red-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-full">
            {uploading ? (
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-neutral-900 dark:text-white">
              {isDragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              PNG, JPG, GIF, WebP up to {maxSize / (1024 * 1024)}MB
            </p>
          </div>
        </div>
      </div>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                Some files were rejected:
              </p>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {fileRejections.map(({ file, errors }) => (
                  <li key={file.name}>
                    {file.name}:{' '}
                    {errors.map((e) => e.message).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Upload Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">
            Uploaded Files:
          </p>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <ImageIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 truncate">
                      {file.url}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 text-green-600 dark:text-green-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
