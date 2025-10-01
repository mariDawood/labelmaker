"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LabelPreview, { BackgroundPattern } from "@/components/LabelPreview";
import { PrinterIcon, ArrowLeftIcon } from "lucide-react";
import * as htmlToImage from "html-to-image";

function getStringParam(searchParams: URLSearchParams, key: string, fallback: string) {
  const v = searchParams.get(key);
  return v != null && v.length > 0 ? v : fallback;
}

function getPatternParam(searchParams: URLSearchParams, key: string, fallback: BackgroundPattern) {
  const v = searchParams.get(key) as BackgroundPattern | null;
  return v === "none" || v === "dots" || v === "grid" || v === "diagonal" ? v : fallback;
}

function getNumberParam(searchParams: URLSearchParams, key: string, fallback: number) {
  const v = searchParams.get(key);
  const parsed = v ? parseFloat(v) : NaN;
  return isNaN(parsed) ? fallback : parsed;
}

export default function PrintPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [count, setCount] = useState<number>(6); // Default to 6 as requested
  const [currentPage, setCurrentPage] = useState<number>(1); // For carousel navigation
  const captureHostRef = useRef<HTMLDivElement | null>(null);
  const [labelPngDataUrl, setLabelPngDataUrl] = useState<string>("");

  // Label design data - always from parameters to preserve exact design
  const [text, setText] = useState("Your Text");
  const [logoColor, setLogoColor] = useState("#8B5CF6");
  const [pattern, setPattern] = useState<BackgroundPattern>("dots");
  const [patternColor, setPatternColor] = useState("#5B21B6");
  const [textPosition, setTextPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [textSize, setTextSize] = useState<{ width: number; height: number; fontSize: number }>({ width: 200, height: 80, fontSize: 24 });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const sp = new URLSearchParams(window.location.search);
    
    // Always load from parameters to preserve exact design
    setText(getStringParam(sp, "text", "One apple\nTwo apples"));
    setLogoColor(getStringParam(sp, "logoColor", "#8B5CF6"));
    setPattern(getPatternParam(sp, "pattern", "dots"));
    setPatternColor(getStringParam(sp, "patternColor", "#5B21B6"));
    setTextPosition({
      x: getNumberParam(sp, "textX", 50),
      y: getNumberParam(sp, "textY", 50)
    });
    setTextSize({
      width: getNumberParam(sp, "textWidth", 200),
      height: getNumberParam(sp, "textHeight", 80),
      fontSize: getNumberParam(sp, "textFontSize", 24)
    });
  }, [isMounted]);

  // Generate a high-DPI PNG of the label that exactly matches the on-screen design
  const generateLabelPng = async () => {
    if (!captureHostRef.current) return;
    // Render once, then rasterize at a high pixel ratio for crisp printing
    try {
      const node = captureHostRef.current;
      const dataUrl = await htmlToImage.toPng(node, {
        pixelRatio: 3,
        cacheBust: true,
        skipAutoScale: true,
        backgroundColor: "#ffffff",
      });
      setLabelPngDataUrl(dataUrl);
    } catch (e) {
      // Fallback: let print continue with live DOM if rasterization fails
      // eslint-disable-next-line no-console
      console.error("Failed to rasterize label for printing", e);
    }
  };

  // Regenerate raster whenever inputs change
  useEffect(() => {
    if (!isMounted) return;
    generateLabelPng();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, logoColor, pattern, patternColor, textPosition.x, textPosition.y, textSize.width, textSize.height, textSize.fontSize]);

  // Reset to page 1 when count changes
  useEffect(() => {
    setCurrentPage(1);
  }, [count]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return; // Don't interfere with input fields
      
      const a4WidthCm = 21 - 1;
      const a4HeightCm = 29.7 - 1;
      const labelWidthCm = 6;
      const labelHeightCm = 4;
      const spacingCm = 0.3;
      const maxLabelsPerRow = Math.floor((a4WidthCm + spacingCm) / (labelWidthCm + spacingCm));
      const maxLabelsPerCol = Math.floor((a4HeightCm + spacingCm) / (labelHeightCm + spacingCm));
      const maxLabelsOnA4 = maxLabelsPerRow * maxLabelsPerCol;
      const totalPages = Math.ceil(count / maxLabelsOnA4);

      if (totalPages <= 1) return;
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentPage(prev => Math.max(1, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentPage(totalPages);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [count, currentPage]);

  // Calculate cm dimensions for A4 printing
  const labelWidthCm = 6; // Standard label width in cm
  const labelHeightCm = 4; // Standard label height in cm

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* Header with back button and print button */}
      <div className="print:hidden flex items-center justify-between gap-3 mb-6">
        <Link href="/" className="rounded-md border border-foreground/20 px-3 py-2 text-sm text-foreground hover:bg-foreground hover:text-background flex items-center gap-2">
          <ArrowLeftIcon className="w-4 h-4" />
        </Link>
        <button 
          onClick={async () => {
            await generateLabelPng();
            // Give the browser a tick to paint images into the print layout
            setTimeout(() => window.print(), 50);
          }} 
          className="rounded-md border border-foreground/20 px-3 py-2 text-sm text-foreground hover:bg-foreground hover:text-background flex items-center gap-2"
        >
          <PrinterIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Controls and Preview */}
      <div className="print:hidden grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left side - Controls */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Print Settings</h2>
          
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Repeat count</label>
                <input 
                  type="number" 
                  min={1} 
                  step={1} 
                  value={count} 
                  onChange={(e) => setCount(Math.max(1, Number(e.target.value)))} 
                  className="w-full h-10 rounded border border-foreground/20 bg-background text-foreground px-2" 
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Label size</label>
                <div className="text-sm text-foreground/60 pt-2">
                  {labelWidthCm} × {labelHeightCm} cm
            </div>
          </div>
        </div>

            <div className="p-4 bg-foreground/5 border border-foreground/10 rounded-lg">
              <div className="border border-foreground/20 bg-white rounded p-2 inline-block">
                <div style={{ width: '200px', height: '133px' }}>
            <LabelPreview 
              text={text} 
              logoColor={logoColor} 
              pattern={pattern} 
              patternColor={patternColor}
              textPosition={textPosition}
              textSize={textSize}
              className="w-full h-full" 
            />
          </div>
        </div>
      </div>
          </div>
        </div>

        {/* Right side - Print Page Preview */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Print Page Preview</h2>
          
          <div className="border border-foreground/20 rounded-lg p-4 bg-background">
            {(() => {
              // A4 calculations
              const a4WidthCm = 21 - 1; // 20cm usable (0.5cm margins each side)
              const a4HeightCm = 29.7 - 1; // 28.7cm usable (0.5cm margins top/bottom)
              const labelWidthCm = 6;
              const labelHeightCm = 4;
              const spacingCm = 0.3; // 3mm spacing between labels
              
              const maxLabelsPerRow = Math.floor((a4WidthCm + spacingCm) / (labelWidthCm + spacingCm)); // 3
              const maxLabelsPerCol = Math.floor((a4HeightCm + spacingCm) / (labelHeightCm + spacingCm)); // 6
              const maxLabelsOnA4 = maxLabelsPerRow * maxLabelsPerCol; // 18
              
              const totalPages = Math.ceil(count / maxLabelsOnA4);
              
              // Calculate labels for current page
              const startIndex = (currentPage - 1) * maxLabelsOnA4;
              const endIndex = Math.min(startIndex + maxLabelsOnA4, count);
              const labelsOnCurrentPage = endIndex - startIndex;
              
              const actualCols = Math.min(maxLabelsPerRow, Math.ceil(Math.sqrt(labelsOnCurrentPage)));
              const actualRows = Math.ceil(labelsOnCurrentPage / actualCols);
              
              const labelWidthPercent = (labelWidthCm / (a4WidthCm + 1)) * 100;
              const labelHeightPercent = (labelHeightCm / (a4HeightCm + 1)) * 100;
              const spacingWidthPercent = (spacingCm / (a4WidthCm + 1)) * 100;
              const spacingHeightPercent = (spacingCm / (a4HeightCm + 1)) * 100;
              
              return (
                <>
                  {/* Clean Carousel Header */}
                  <div className="bg-gradient-to-r from-blue-50/20 to-indigo-50/20 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 mb-4 border border-foreground/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-foreground">
                          {count} label{count !== 1 ? 's' : ''}
                        </div>
                        <div className="w-px h-4 bg-foreground/20"></div>
                        <div className="text-sm text-foreground/70">
                          Page {currentPage} of {totalPages}
                        </div>
                      </div>
                      
                      {totalPages > 1 && (
                        <div className="flex items-center gap-1 bg-background rounded-lg p-1 shadow-sm border border-foreground/20">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="group flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition-all duration-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-foreground/10 hover:text-foreground active:scale-95 active:bg-foreground/20 text-foreground"
                          >
                            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Prev
                          </button>
                          
                          <div className="px-2 py-1 text-xs font-mono text-foreground/70 bg-foreground/5 rounded min-w-[3rem] text-center">
                            {currentPage}/{totalPages}
                          </div>
                          
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="group flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition-all duration-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-foreground/10 hover:text-foreground active:scale-95 active:bg-foreground/20 text-foreground"
                          >
                            Next
                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Progress bar */}
                    {totalPages > 1 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-foreground/10 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
                              style={{ width: `${(currentPage / totalPages) * 100}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-foreground/70 font-medium">
                            {Math.round((currentPage / totalPages) * 100)}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Portrait A4-like preview */}
                  <div className="w-full max-w-sm mx-auto bg-white border border-foreground/20 rounded-lg shadow-lg overflow-hidden" style={{ aspectRatio: '210/297' }}>
                    {/* Paper effect - keep white to represent actual paper */}
                    <div className="w-full h-full bg-gradient-to-br from-white to-gray-50 p-2 relative">
                      {/* Show A4 margins with subtle pattern */}
                      <div className="w-full h-full p-1 relative" style={{ background: 'linear-gradient(45deg, #f8f9fa 25%, transparent 25%), linear-gradient(-45deg, #f8f9fa 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8f9fa 75%), linear-gradient(-45deg, transparent 75%, #f8f9fa 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' }}>
                        {Array.from({ length: labelsOnCurrentPage }).map((_, i) => {
                          const row = Math.floor(i / actualCols);
                          const col = i % actualCols;
                          
                          return (
                            <div 
                              key={startIndex + i} 
                              className="absolute border border-gray-300 bg-white shadow-sm"
                  style={{ 
                                left: `${2 + col * (labelWidthPercent + spacingWidthPercent)}%`,
                                top: `${2 + row * (labelHeightPercent + spacingHeightPercent)}%`,
                                width: `${labelWidthPercent}%`,
                                height: `${labelHeightPercent}%`,
                              }}
                            >
                              <LabelPreview
                                text={text}
                                logoColor={logoColor}
                                pattern={pattern}
                                patternColor={patternColor}
                                textPosition={textPosition}
                                textSize={textSize}
                                className="w-full h-full"
                                forceScale={0.15} // Small scale for tiny preview boxes
                />
              </div>
                          );
                        })}
                        
                        {/* Page indicator */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-foreground bg-background/95 backdrop-blur-sm px-2 py-1 rounded-full shadow-lg border border-foreground/20">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          Page {currentPage}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Hidden, off-screen capture host used to make a pixel-perfect PNG */}
      <div aria-hidden="true" style={{ position: "fixed", left: -10000, top: -10000, width: 600, height: 400, pointerEvents: "none", opacity: 1 }}>
        <div ref={captureHostRef} style={{ width: 600, height: 400 }}>
          <LabelPreview 
            text={text} 
            logoColor={logoColor} 
            pattern={pattern} 
            patternColor={patternColor}
            textPosition={textPosition}
            textSize={textSize}
            className="w-full h-full"
            forceScale={1}
          />
        </div>
      </div>

      {/* Print Layout - This is what gets printed */}
      <div className="hidden print:block page-print">
        {(() => {
          // Same calculations as preview to ensure identical layout
          const a4WidthCm = 21 - 1; // 20cm usable
          const a4HeightCm = 29.7 - 1; // 28.7cm usable  
          const printLabelWidthCm = 6; // Must match preview exactly
          const printLabelHeightCm = 4; // Must match preview exactly
          const spacingCm = 0.3; // 3mm spacing
          
          const maxLabelsPerRow = Math.floor((a4WidthCm + spacingCm) / (printLabelWidthCm + spacingCm));
          const maxLabelsPerCol = Math.floor((a4HeightCm + spacingCm) / (printLabelHeightCm + spacingCm));
          const maxPerPage = maxLabelsPerRow * maxLabelsPerCol; // 3 x 6 = 18

          const totalPages = Math.ceil(count / maxPerPage);

          return (
            <>
              {Array.from({ length: totalPages }).map((_, pageIndex) => {
                const start = pageIndex * maxPerPage;
                const end = Math.min(start + maxPerPage, count);
                const items = end - start;
                return (
                  <div key={pageIndex} className={`print-page ${pageIndex < totalPages - 1 ? 'print-break' : ''}`}>
                    <div
                      className="print-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${maxLabelsPerRow}, ${printLabelWidthCm}cm)`,
                        gap: `${spacingCm}cm`,
                        justifyContent: 'start',
                        alignContent: 'start',
                        padding: 0,
                        margin: 0,
                        pageBreakInside: 'avoid'
                      }}
                    >
                      {Array.from({ length: items }).map((__, i) => (
                        <div
                          key={start + i}
                          className="print-label"
                          style={{
                            width: `${printLabelWidthCm}cm`,
                            height: `${printLabelHeightCm}cm`,
                            pageBreakInside: 'avoid',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#fff'
                          }}
                        >
                          {labelPngDataUrl ? (
                            <img
                              src={labelPngDataUrl}
                              alt="label"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <LabelPreview
                              text={text}
                              logoColor={logoColor}
                              pattern={pattern}
                              patternColor={patternColor}
                              textPosition={textPosition}
                              textSize={textSize}
                              className="w-full h-full"
                              forceScale={0.6}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          );
        })()}
      </div>

      {/* Print styles */}
      <style jsx>{`
        @media print {
          .page-print {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 6cm) !important;
            gap: 0.3cm !important;
            justify-content: start !important;
            align-content: start !important;
            width: fit-content !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-page.print-break {
            break-after: page !important;
            page-break-after: always !important;
          }
          .print-label {
            width: 6cm !important;
            height: 4cm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
          }
          .print-label img { 
            display: block !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .print-label [data-label-container] {
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .print-label [data-label-container] > div:nth-child(2) {
            background-color: ${logoColor} !important;
          }
          .print-label [data-label-container] > div:first-child {
            background-color: white !important;
            filter: blur(8px) !important;
            opacity: 0.6 !important;
          }
          @page {
            margin: 0.5cm;
            size: A4;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}