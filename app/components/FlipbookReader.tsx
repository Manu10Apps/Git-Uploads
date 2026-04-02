'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Share2 } from 'lucide-react';

// Set worker for pdfjs
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface FlipbookReaderProps {
  pdfUrl: string;
  title: string;
  issueDate: string;
}

export function FlipbookReader({ pdfUrl, title, issueDate }: FlipbookReaderProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any | null>(null);

  // Load PDF
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        pdfRef.current = pdf;
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setError(null);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load E-Paper. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [pdfUrl]);

  // Render current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfRef.current || !canvasRef.current) return;

      try {
        const page = await pdfRef.current.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    if (pdfRef.current && totalPages > 0) {
      renderPage();
    }
  }, [currentPage, scale, totalPages]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPreviousPage();
      if (e.key === 'ArrowRight') goToNextPage();
      if (e.key === '+') zoomIn();
      if (e.key === '-') zoomOut();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, scale, totalPages]);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 1));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title}.pdf`;
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Check out the latest ${title}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-700 dark:text-neutral-300">Loading E-Paper...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Reader Header */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{title}</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{issueDate}</p>
          </div>
          <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="bg-neutral-100 dark:bg-neutral-900 rounded-lg overflow-auto flex items-center justify-center mb-4"
        style={{ maxHeight: '600px' }}
      >
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto shadow-lg"
          style={{ margin: 'auto' }}
        />
      </div>

      {/* Controls Bar */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-4 space-y-4">
        {/* Navigation Controls */}
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value);
              if (page >= 1 && page <= totalPages) {
                setCurrentPage(page);
              }
            }}
            className="w-20 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-center dark:bg-neutral-700 dark:text-white"
          />

          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Zoom and Actions */}
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={zoomOut}
            disabled={scale <= 1}
            className="flex items-center gap-2 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 transition"
          >
            <ZoomOut size={18} />
            <span className="hidden sm:inline">Zoom Out</span>
          </button>

          <div className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-700">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {Math.round(scale * 100)}%
            </span>
          </div>

          <button
            onClick={zoomIn}
            disabled={scale >= 3}
            className="flex items-center gap-2 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 transition"
          >
            <ZoomIn size={18} />
            <span className="hidden sm:inline">Zoom In</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition"
          >
            <Share2 size={18} />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Keyboard Hint */}
        <div className="text-xs text-center text-neutral-600 dark:text-neutral-400">
          💡 Tip: Use arrow keys to navigate, +/- to zoom
        </div>
      </div>
    </div>
  );
}
