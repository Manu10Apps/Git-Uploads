'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Download, Share2, Grid, Maximize2, Minimize2,
  Play, Pause, Volume2, VolumeX,
} from 'lucide-react';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface FlipbookReaderProps {
  pdfUrl: string;
  title: string;
  issueDate: string;
}

// Spread 0 = cover (right side only). Spread k≥1 = pages [2k, 2k+1].
function getSpreadPages(
  spreadIdx: number,
  total: number,
): [number | null, number | null] {
  if (total === 0) return [null, null];
  if (spreadIdx === 0) return [null, 1];
  const l = spreadIdx * 2;
  const r = l + 1;
  return [l <= total ? l : null, r <= total ? r : null];
}

function getMaxSpread(total: number): number {
  return total <= 1 ? 0 : Math.ceil((total - 1) / 2);
}

export function FlipbookReader({ pdfUrl, title, issueDate }: FlipbookReaderProps) {
  // ── Refs ─────────────────────────────────────────────────────────────────────
  const pdfRef        = useRef<any>(null);
  const pageCache     = useRef(new Map<number, string>()); // pageNum → dataURL
  const thumbCache    = useRef(new Map<number, string>()); // pageNum → thumb dataURL
  const rendering     = useRef(new Set<number>());         // currently rendering
  const flipTimer     = useRef<ReturnType<typeof setTimeout>>();
  const touchStartX   = useRef<number | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);

  // ── State ─────────────────────────────────────────────────────────────────────
  const [totalPages,   setTotalPages  ] = useState(0);
  const [spreadIdx,    setSpreadIdx   ] = useState(0);
  const [renderScale,  setRenderScale ] = useState(1.3);
  const [, forceRender] = useState(0); // bumped when a page finishes rendering
  const [loading,      setLoading     ] = useState(true);
  const [error,        setError       ] = useState<string | null>(null);
  const [showThumbs,   setShowThumbs  ] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile,     setIsMobile    ] = useState(false);

  // flip animation ── flipDir: null = idle, 'forward'/'backward' = animating
  const [flipDir,   setFlipDir  ] = useState<'forward' | 'backward' | null>(null);
  const [flipFrom,  setFlipFrom ] = useState(0);
  const [flipTo,    setFlipTo   ] = useState(0);
  const [flipStage, setFlipStage] = useState<0 | 1>(0); // 0 = at 0°, 1 = rotate to ±180°
  const isFlipping = flipDir !== null;
  const maxSpread  = getMaxSpread(totalPages);

  // Auto-play & sound
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPlay,     setAutoPlay    ] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval>>();

  // ── Detect mobile ────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Load PDF ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);
    pageCache.current.clear();
    thumbCache.current.clear();
    rendering.current.clear();
    setSpreadIdx(0);
    setFlipDir(null);
    pdfjsLib.getDocument(pdfUrl).promise
      .then((doc: any) => {
        pdfRef.current = doc;
        setTotalPages(doc.numPages);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load E-Paper. Please try again later.');
        setLoading(false);
      });
  }, [pdfUrl]);

  // ── Render a page to dataURL ─────────────────────────────────────────────────
  const doRender = useCallback(async (pageNum: number, scale: number) => {
    if (rendering.current.has(pageNum) || !pdfRef.current) return;
    if (pageCache.current.has(pageNum)) return;
    rendering.current.add(pageNum);
    try {
      const page     = await pdfRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas   = document.createElement('canvas');
      canvas.width   = Math.floor(viewport.width);
      canvas.height  = Math.floor(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
      pageCache.current.set(pageNum, canvas.toDataURL('image/jpeg', 0.88));
      forceRender(n => n + 1);
    } catch { /* ignored */ }
    finally { rendering.current.delete(pageNum); }
  }, []);

  const doThumb = useCallback(async (pageNum: number) => {
    if (thumbCache.current.has(pageNum) || !pdfRef.current) return;
    try {
      const page     = await pdfRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.22 });
      const canvas   = document.createElement('canvas');
      canvas.width   = Math.floor(viewport.width);
      canvas.height  = Math.floor(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
      thumbCache.current.set(pageNum, canvas.toDataURL('image/jpeg', 0.65));
      forceRender(n => n + 1);
    } catch { /* ignored */ }
  }, []);

  // ── Pre-render current + adjacent spreads ────────────────────────────────────
  useEffect(() => {
    if (totalPages === 0) return;
    pageCache.current.clear();
    rendering.current.clear();
    for (let s = Math.max(0, spreadIdx - 1); s <= Math.min(maxSpread, spreadIdx + 2); s++) {
      const [l, r] = getSpreadPages(s, totalPages);
      if (l) doRender(l, renderScale);
      if (r) doRender(r, renderScale);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, spreadIdx, renderScale]);

  // ── Lazy thumbnails ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showThumbs || totalPages === 0) return;
    for (let p = 1; p <= totalPages; p++) doThumb(p);
  }, [showThumbs, totalPages, doThumb]);

  // ── Page-turn sound (synthesised paper rustle via Web Audio API) ────────────
  const playFlipSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const dur = 0.14;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.8);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2600;
      bp.Q.value = 0.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.38, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      src.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      src.stop(ctx.currentTime + dur);
    } catch { /* unsupported */ }
  }, [soundEnabled]);

  // ── Auto-play slideshow ──────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(autoPlayRef.current);
    if (!autoPlay) return;
    autoPlayRef.current = setInterval(() => {
      setSpreadIdx(prev => {
        const next = prev + 1;
        if (next > getMaxSpread(totalPages)) {
          setAutoPlay(false);
          return prev;
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(autoPlayRef.current);
  }, [autoPlay, totalPages]);

  // Stop auto-play when user manually navigates
  const stopAutoPlay = useCallback(() => {
    if (autoPlay) setAutoPlay(false);
  }, [autoPlay]);

  // ── Navigate with 3-D page-flip animation ───────────────────────────────────
  const navigate = useCallback((dir: 'forward' | 'backward') => {
    if (isFlipping) return;
    const from = spreadIdx;
    const to   = dir === 'forward'
      ? Math.min(from + 1, maxSpread)
      : Math.max(from - 1, 0);
    if (to === from) return;

    stopAutoPlay();
    playFlipSound();

    // Pre-render target spread
    const [tl, tr] = getSpreadPages(to, totalPages);
    if (tl) doRender(tl, renderScale);
    if (tr) doRender(tr, renderScale);

    setFlipFrom(from);
    setFlipTo(to);
    setFlipDir(dir);
    setFlipStage(0);
    // Wait two frames so React paints the initial rotateY(0°), then trigger the transition
    requestAnimationFrame(() => requestAnimationFrame(() => setFlipStage(1)));

    clearTimeout(flipTimer.current);
    flipTimer.current = setTimeout(() => {
      setSpreadIdx(to);
      setFlipDir(null);
      setFlipStage(0);
    }, 540);
  }, [isFlipping, spreadIdx, maxSpread, totalPages, renderScale, doRender]);

  // Direct jump (thumbnail / dot click) — no animation
  const jumpTo = useCallback((s: number) => {
    stopAutoPlay();
    clearTimeout(flipTimer.current);
    setFlipDir(null);
    setFlipStage(0);
    setSpreadIdx(s);
    setShowThumbs(false);
  }, [stopAutoPlay]);

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate('forward');
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigate('backward');
      else if (e.key === '+' || e.key === '=') setRenderScale(s => Math.min(s + 0.2, 2.5));
      else if (e.key === '-') setRenderScale(s => Math.max(s - 0.2, 0.7));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // ── Fullscreen ───────────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // ── Derived display state ────────────────────────────────────────────────────
  const dispSpread             = isFlipping ? flipFrom : spreadIdx;
  const [dispLeft, dispRight]  = getSpreadPages(dispSpread, totalPages);
  const [nextLeft, nextRight]  = isFlipping ? getSpreadPages(flipTo, totalPages) : [null, null];

  // Background pages visible beneath the flip element
  const bgLeftPage  = isFlipping && flipDir === 'backward' ? nextLeft  : dispLeft;
  const bgRightPage = isFlipping && flipDir === 'forward'  ? nextRight : dispRight;

  // Faces of the flipping page
  const flipFront = isFlipping ? (flipDir === 'forward' ? dispRight  : dispLeft  ) : null;
  const flipBack  = isFlipping ? (flipDir === 'forward' ? nextLeft   : nextRight ) : null;

  // Flip element spans the right half when going forward, left half when backward
  const flipOnLeft   = flipDir === 'backward';
  const flipOrigin   = flipOnLeft ? 'right center' : 'left center';
  const flipRotation = flipStage === 1
    ? `rotateY(${flipDir === 'forward' ? -180 : 180}deg)`
    : 'rotateY(0deg)';

  // Page label
  const label = (() => {
    if (spreadIdx === 0) return 'Cover';
    const [l, r] = getSpreadPages(spreadIdx, totalPages);
    if (l && r) return `Pages ${l}–${r}`;
    if (l) return `Page ${l}`;
    if (r) return `Page ${r}`;
    return '';
  })();

  const img   = (n: number | null) => n != null ? pageCache.current.get(n) : undefined;
  const thumb = (n: number)         => thumbCache.current.get(n);

  const Spinner = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
    </div>
  );

  // ── Loading / error states ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 bg-gray-50 rounded-xl border border-gray-200">
        <div className="w-14 h-14 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm font-medium">Loading E-Paper…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96 bg-red-50 rounded-xl border border-red-200">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="flex flex-col w-full bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden select-none"
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchStartX.current == null) return;
        const dx = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(dx) > 60) navigate(dx > 0 ? 'forward' : 'backward');
        touchStartX.current = null;
      }}
    >
      {/* ── Top control bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0 gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-800 truncate leading-tight">{title}</p>
          <p className="text-xs text-gray-400 truncate">{issueDate}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setSoundEnabled(v => !v)}
            title={soundEnabled ? 'Mute sound' : 'Enable sound'}
            className={`p-1.5 rounded-lg transition-colors ${soundEnabled ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-100'}`}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <button
            onClick={() => setAutoPlay(v => !v)}
            title={autoPlay ? 'Pause slideshow' : 'Auto-play slideshow'}
            className={`p-1.5 rounded-lg transition-colors ${autoPlay ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {autoPlay ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={() => { setShowThumbs(v => !v); }}
            title="All pages"
            className={`p-1.5 rounded-lg transition-colors ${showThumbs ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Grid size={14} />
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            onClick={() => setRenderScale(s => Math.max(s - 0.2, 0.7))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs text-gray-400 w-8 text-center tabular-nums">{Math.round(renderScale * 100)}%</span>
          <button
            onClick={() => setRenderScale(s => Math.min(s + 0.2, 2.5))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <a
            href={pdfUrl}
            download
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Download PDF"
          >
            <Download size={14} />
          </a>
          <button
            onClick={async () => {
              if (navigator.share) await navigator.share({ title, url: window.location.href }).catch(() => {});
              else await navigator.clipboard.writeText(window.location.href).catch(() => {});
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Share"
          >
            <Share2 size={14} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* ── Thumbnail drawer ─────────────────────────────────────────────────── */}
      {showThumbs && (
        <div className="bg-gray-50 border-b border-gray-200 px-3 py-2.5 overflow-x-auto shrink-0">
          <div className="flex gap-2 pb-1">
            {Array.from({ length: totalPages }, (_, i) => {
              const p  = i + 1;
              const s  = p === 1 ? 0 : Math.ceil((p - 1) / 2);
              const active = p === dispLeft || p === dispRight;
              return (
                <button
                  key={p}
                  onClick={() => jumpTo(s)}
                  className={`shrink-0 rounded overflow-hidden border-2 transition-all ${active ? 'border-red-500 shadow-sm' : 'border-gray-200 hover:border-gray-400'}`}
                  style={{ width: 50, height: 66 }}
                >
                  {thumb(p)
                    ? <img src={thumb(p)} alt={`Pg ${p}`} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-medium">{p}</div>
                  }
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Book viewer ──────────────────────────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center bg-[#ddd8cc] px-4 py-6 overflow-hidden min-h-64"
        style={{ perspective: '2200px' }}
      >
        {/* Prev arrow */}
        <button
          onClick={() => navigate('backward')}
          disabled={spreadIdx === 0 || isFlipping}
          className="shrink-0 p-2.5 rounded-full bg-white shadow-md hover:shadow-lg disabled:opacity-25 disabled:cursor-not-allowed text-gray-600 hover:text-gray-900 transition-all mr-3 z-10"
        >
          <ChevronLeft size={20} />
        </button>

        {/* ── The book ───────────────────────────────────────────────────────── */}
        <div
          className="relative flex items-stretch"
          style={{
            maxHeight: '72vh',
            transformStyle: 'preserve-3d',
            boxShadow: '0 12px 48px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.14)',
            borderRadius: 4,
          }}
        >
          {/* Left page (hidden on mobile or when no left page) */}
          {!isMobile && bgLeftPage && (
            <>
              <div
                className="overflow-hidden bg-white"
                style={{
                  maxHeight: '72vh',
                  maxWidth: '38vw',
                  minWidth: 80,
                  boxShadow: 'inset -8px 0 16px rgba(0,0,0,0.07)',
                  borderRadius: '4px 0 0 4px',
                }}
              >
                {img(bgLeftPage)
                  ? <img src={img(bgLeftPage)!} alt={`p${bgLeftPage}`} className="block max-h-full w-auto" style={{ maxHeight: '72vh' }} />
                  : <div className="h-full w-48 relative"><Spinner /></div>
                }
              </div>
              {/* Spine */}
              <div
                className="shrink-0 self-stretch"
                style={{
                  width: 12,
                  background: 'linear-gradient(to right,#b0a898 0%,#e2ddd5 30%,#f0ece4 50%,#e2ddd5 70%,#b0a898 100%)',
                }}
              />
            </>
          )}

          {/* Right page */}
          <div
            className="overflow-hidden bg-white"
            style={{
              maxHeight: '72vh',
              maxWidth: (isMobile || !bgLeftPage) ? '90vw' : '38vw',
              minWidth: 120,
              boxShadow: (!isMobile && bgLeftPage) ? '6px 0 20px rgba(0,0,0,0.18)' : '0 4px 24px rgba(0,0,0,0.18)',
              borderRadius: (!isMobile && bgLeftPage) ? '0 4px 4px 0' : '4px',
            }}
          >
            {bgRightPage && (
              img(bgRightPage)
                ? <img src={img(bgRightPage)!} alt={`p${bgRightPage}`} className="block max-h-full w-auto" style={{ maxHeight: '72vh' }} />
                : <div className="h-full w-48 relative"><Spinner /></div>
            )}
          </div>

          {/* ── 3-D flip overlay (only during animation) ─────────────────────── */}
          {isFlipping && flipFront != null && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: !flipOnLeft ? ((!isMobile && bgLeftPage) ? '50%' : '0%') : '0%',
                right: flipOnLeft ? ((!isMobile && bgLeftPage) ? '50%' : '0%') : '0%',
                transformOrigin: flipOrigin,
                transform: flipRotation,
                transition: flipStage === 1 ? 'transform 0.52s cubic-bezier(0.4,0,0.2,1)' : 'none',
                transformStyle: 'preserve-3d',
                zIndex: 40,
              }}
            >
              {/* Front face */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  background: 'white',
                  overflow: 'hidden',
                }}
              >
                {img(flipFront)
                  ? <img src={img(flipFront)!} alt="" className="block max-h-full w-auto" style={{ maxHeight: '100%' }} />
                  : <Spinner />
                }
                <div
                  style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: flipDir === 'forward'
                      ? 'linear-gradient(to right, transparent 65%, rgba(0,0,0,0.08))'
                      : 'linear-gradient(to left,  transparent 65%, rgba(0,0,0,0.08))',
                  }}
                />
              </div>

              {/* Back face */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: 'white',
                  overflow: 'hidden',
                }}
              >
                {flipBack != null && img(flipBack)
                  ? <img src={img(flipBack)!} alt="" className="block max-h-full w-auto" style={{ maxHeight: '100%' }} />
                  : <Spinner />
                }
              </div>
            </div>
          )}
        </div>

        {/* Next arrow */}
        <button
          onClick={() => navigate('forward')}
          disabled={spreadIdx >= maxSpread || isFlipping}
          className="shrink-0 p-2.5 rounded-full bg-white shadow-md hover:shadow-lg disabled:opacity-25 disabled:cursor-not-allowed text-gray-600 hover:text-gray-900 transition-all ml-3 z-10"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ── Bottom bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-gray-200 shrink-0">
        <span className="text-xs text-gray-400 w-24 font-medium">{label}</span>

        {/* Dot / page pagination */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-1">
          {Array.from({ length: Math.min(maxSpread + 1, 15) }, (_, i) => (
            <button
              key={i}
              onClick={() => jumpTo(i)}
              className={`shrink-0 rounded-full transition-all duration-200 ${
                i === spreadIdx ? 'w-3 h-3 bg-red-500 scale-110' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
          {maxSpread + 1 > 15 && (
            <span className="text-xs text-gray-400 ml-1">+{maxSpread + 1 - 15}</span>
          )}
        </div>

        <span className="text-xs text-gray-400 text-right w-24 font-medium">
          {spreadIdx + 1} / {maxSpread + 1}
        </span>
      </div>
    </div>
  );
}
