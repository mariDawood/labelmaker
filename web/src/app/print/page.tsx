"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LabelPreview, { BackgroundPattern } from "@/components/LabelPreview";
import { PrinterIcon, ArrowLeftIcon } from "lucide-react";
import * as htmlToImage from "html-to-image";
import { loadDesignState, defaultDesignState } from "@/utils/designState";

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

  // Label design data - load from saved state first, then fallback to parameters
  const [text, setText] = useState(defaultDesignState.text);
  const [logoColor, setLogoColor] = useState(defaultDesignState.logoColor);
  const [pattern, setPattern] = useState<BackgroundPattern>(defaultDesignState.pattern);
  const [patternColor, setPatternColor] = useState(defaultDesignState.patternColor);
  const [textColor, setTextColor] = useState(defaultDesignState.textColor);
  const [textPosition, setTextPosition] = useState<{ x: number; y: number }>(defaultDesignState.textPosition);
  const [textSize, setTextSize] = useState<{ width: number; height: number; fontSize: number }>(defaultDesignState.textSize);
  const [labelDimensions, setLabelDimensions] = useState<{ width: number; height: number }>({ width: 6, height: 4 }); // cm

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    // First try to load from saved state
    const savedState = loadDesignState();
    if (savedState) {
      setText(savedState.text);
      setLogoColor(savedState.logoColor);
      setPattern(savedState.pattern);
      setPatternColor(savedState.patternColor);
      setTextColor(savedState.textColor);
      setTextPosition(savedState.textPosition);
      setTextSize(savedState.textSize);
    } else {
      // Fallback to URL parameters if no saved state
      const sp = new URLSearchParams(window.location.search);
      setText(getStringParam(sp, "text", defaultDesignState.text));
      setLogoColor(getStringParam(sp, "logoColor", defaultDesignState.logoColor));
      setPattern(getPatternParam(sp, "pattern", defaultDesignState.pattern));
      setPatternColor(getStringParam(sp, "patternColor", defaultDesignState.patternColor));
      setTextColor(getStringParam(sp, "textColor", defaultDesignState.textColor));
      setTextPosition({
        x: getNumberParam(sp, "textX", defaultDesignState.textPosition.x),
        y: getNumberParam(sp, "textY", defaultDesignState.textPosition.y)
      });
      setTextSize({
        width: getNumberParam(sp, "textWidth", defaultDesignState.textSize.width),
        height: getNumberParam(sp, "textHeight", defaultDesignState.textSize.height),
        fontSize: getNumberParam(sp, "textFontSize", defaultDesignState.textSize.fontSize)
      });
    }
    
    // Always load label dimensions from URL parameters
    const sp = new URLSearchParams(window.location.search);
    setLabelDimensions({
      width: getNumberParam(sp, "labelWidth", 6),
      height: getNumberParam(sp, "labelHeight", 4)
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
      console.error("Failed to rasterize label for printing", e);
    }
  };

  // Regenerate raster whenever inputs change
  useEffect(() => {
    if (!isMounted) return;
    generateLabelPng();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, logoColor, pattern, patternColor, textColor, textPosition.x, textPosition.y, textSize.width, textSize.height, textSize.fontSize, labelDimensions.width, labelDimensions.height]);

  // Reset to page 1 when count changes
  useEffect(() => {
    setCurrentPage(1);
  }, [count]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return; // Don't interfere with input fields
      
      // A4 calculations with correct margins (matching print layout)
      const a4WidthCm = 21;
      const a4HeightCm = 29.7;
      const horizontalMargins = 2.1 * 2;
      const verticalMargins = 2.97 * 2;
      
      const usableWidthCm = a4WidthCm - horizontalMargins; // 16.8cm
      const usableHeightCm = a4HeightCm - verticalMargins; // 23.76cm
      
      const labelWidthCm = labelDimensions.width;
      const labelHeightCm = labelDimensions.height;
      
              // Calculate maximum labels per row with dynamic spacing
              const calculateMaxLabelsPerRow = (labelWidth: number) => {
                if (labelWidth >= usableWidthCm) return 1;
                let maxLabels = 1;
                const minSpacing = 0.1;
                for (let labels = 2; labels <= 10; labels++) {
                  const totalLabelWidth = labels * labelWidth;
                  const requiredSpacing = (labels - 1) * minSpacing;
                  const totalWidth = totalLabelWidth + requiredSpacing;
                  if (totalWidth <= usableWidthCm) {
                    maxLabels = labels;
                  } else {
                    break;
                  }
                }
                return maxLabels;
              };
              
              // Calculate maximum labels per column with dynamic spacing
              const calculateMaxLabelsPerCol = (labelHeight: number) => {
                if (labelHeight >= usableHeightCm) return 1;
                let maxLabels = 1;
                const minSpacing = 0.1;
                for (let labels = 2; labels <= 20; labels++) {
                  const totalLabelHeight = labels * labelHeight;
                  const requiredSpacing = (labels - 1) * minSpacing;
                  const totalHeight = totalLabelHeight + requiredSpacing;
                  if (totalHeight <= usableHeightCm) {
                    maxLabels = labels;
                  } else {
                    break;
                  }
                }
                return maxLabels;
              };
      
      const maxLabelsPerRow = calculateMaxLabelsPerRow(labelWidthCm);
      const maxLabelsPerCol = calculateMaxLabelsPerCol(labelHeightCm);
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
  }, [count, currentPage, labelDimensions]);

  // Calculate cm dimensions for A4 printing
  const labelWidthCm = labelDimensions.width;
  const labelHeightCm = labelDimensions.height;

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
                  {labelWidthCm.toFixed(1)} × {labelHeightCm.toFixed(1)} cm
            </div>
          </div>
        </div>

        {/* Label Size Controls */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Label Dimensions</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Width (cm)</label>
              <input
                type="number"
                min={1}
                max={20}
                step={0.1}
                value={labelDimensions.width}
                onChange={(e) => {
                  const newWidth = Math.max(1, Math.min(20, parseFloat(e.target.value) || 1));
                  const aspectRatio = labelDimensions.height / labelDimensions.width;
                  setLabelDimensions({ width: newWidth, height: newWidth * aspectRatio });
                }}
                className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Height (cm)</label>
              <input
                type="number"
                min={1}
                max={20}
                step={0.1}
                value={labelDimensions.height}
                onChange={(e) => {
                  const newHeight = Math.max(1, Math.min(20, parseFloat(e.target.value) || 1));
                  const aspectRatio = labelDimensions.width / labelDimensions.height;
                  setLabelDimensions({ width: newHeight * aspectRatio, height: newHeight });
                }}
                className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors"
              />
            </div>
          </div>
          <div className="text-sm text-foreground/70 text-center">
            Current size: {labelDimensions.width.toFixed(1)} × {labelDimensions.height.toFixed(1)} cm
          </div>
        </div>

            <div className="p-4 bg-foreground/5 border border-foreground/10 rounded-lg">
              <div className="border border-foreground/20 bg-white rounded p-2 inline-block">
                <div style={{ width: '200px', height: `${200 * (labelHeightCm / labelWidthCm)}px` }}>
            <LabelPreview 
              text={text} 
              logoColor={logoColor} 
              pattern={pattern} 
              patternColor={patternColor}
              textColor={textColor}
              textPosition={textPosition}
              textSize={textSize}
              labelDimensions={labelDimensions}
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
              // A4 calculations with correct margins (matching print layout)
              const a4WidthCm = 21; // Full A4 width
              const a4HeightCm = 29.7; // Full A4 height
              const horizontalMargins = 2.1 * 2; // 2.1cm margins on each side
              const verticalMargins = 2.97 * 2; // 2.97cm margins top and bottom
              
              const usableWidthCm = a4WidthCm - horizontalMargins; // 16.8cm usable width
              const usableHeightCm = a4HeightCm - verticalMargins; // 23.76cm usable height
              
              // Calculate maximum labels per row with dynamic spacing
              const calculateMaxLabelsPerRow = (labelWidth: number) => {
                if (labelWidth >= usableWidthCm) return 1;
                let maxLabels = 1;
                const minSpacing = 0.1; // Minimum 1mm spacing
                for (let labels = 2; labels <= 10; labels++) {
                  const totalLabelWidth = labels * labelWidth;
                  const requiredSpacing = (labels - 1) * minSpacing;
                  const totalWidth = totalLabelWidth + requiredSpacing;
                  if (totalWidth <= usableWidthCm) {
                    maxLabels = labels;
                  } else {
                    break;
                  }
                }
                return maxLabels;
              };
              
              // Calculate maximum labels per column with dynamic spacing
              const calculateMaxLabelsPerCol = (labelHeight: number) => {
                if (labelHeight >= usableHeightCm) return 1;
                let maxLabels = 1;
                const minSpacing = 0.1; // Minimum 1mm spacing
                for (let labels = 2; labels <= 20; labels++) {
                  const totalLabelHeight = labels * labelHeight;
                  const requiredSpacing = (labels - 1) * minSpacing;
                  const totalHeight = totalLabelHeight + requiredSpacing;
                  if (totalHeight <= usableHeightCm) {
                    maxLabels = labels;
                  } else {
                    break;
                  }
                }
                return maxLabels;
              };
              
              const maxLabelsPerRow = calculateMaxLabelsPerRow(labelWidthCm);
              const maxLabelsPerCol = calculateMaxLabelsPerCol(labelHeightCm);
              const maxLabelsOnA4 = maxLabelsPerRow * maxLabelsPerCol;
              
              const totalPages = Math.ceil(count / maxLabelsOnA4);
              
              // Calculate labels for current page
              const startIndex = (currentPage - 1) * maxLabelsOnA4;
              const endIndex = Math.min(startIndex + maxLabelsOnA4, count);
              const labelsOnCurrentPage = endIndex - startIndex;
              
              const actualCols = Math.min(maxLabelsPerRow, labelsOnCurrentPage);
              const actualRows = Math.ceil(labelsOnCurrentPage / actualCols);
              
              // Calculate dynamic spacing for preview (same as print layout)
              const horizontalSpacing = maxLabelsPerRow > 1 ? 
                (usableWidthCm - (maxLabelsPerRow * labelWidthCm)) / (maxLabelsPerRow - 1) : 0;
              const verticalSpacing = maxLabelsPerCol > 1 ? 
                (usableHeightCm - (maxLabelsPerCol * labelHeightCm)) / (maxLabelsPerCol - 1) : 0;
              
              const spacingWidthPercent = (horizontalSpacing / usableWidthCm) * 100;
              const spacingHeightPercent = (verticalSpacing / usableHeightCm) * 100;
              
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
                        <div 
                          className="grid border border-gray-300 bg-white shadow-sm"
                          style={{
                            gridTemplateColumns: `repeat(${actualCols}, 1fr)`,
                            gridTemplateRows: `repeat(${actualRows}, 1fr)`,
                            gap: `${spacingHeightPercent}% ${spacingWidthPercent}%`,
                            width: '100%',
                            height: '100%',
                            padding: '2%'
                          }}
                        >
                          {Array.from({ length: labelsOnCurrentPage }).map((_, i) => (
                            <div 
                              key={startIndex + i} 
                              className="border border-gray-200 bg-white"
                            >
                              <LabelPreview
                                text={text}
                                logoColor={logoColor}
                                pattern={pattern}
                                patternColor={patternColor}
                                textColor={textColor}
                                textPosition={textPosition}
                                textSize={textSize}
                                labelDimensions={labelDimensions}
                                className="w-full h-full"
                                forceScale={0.15} // Small scale for tiny preview boxes
                              />
                            </div>
                          ))}
                        </div>
                        
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
            textColor={textColor}
            textPosition={textPosition}
            textSize={textSize}
            labelDimensions={labelDimensions}
            className="w-full h-full"
            forceScale={1}
          />
        </div>
      </div>

      {/* Print Layout - This is what gets printed */}
      <div className="hidden print:block page-print">
        {(() => {
          // A4 page dimensions with correct margins
          const a4WidthCm = 21; // Full A4 width
          const a4HeightCm = 29.7; // Full A4 height
          const horizontalMargins = 2.1 * 2; // 2.1cm margins on each side
          const verticalMargins = 2.97 * 2; // 2.97cm margins top and bottom
          
          const usableWidthCm = a4WidthCm - horizontalMargins; // 16.8cm usable width
          const usableHeightCm = a4HeightCm - verticalMargins; // 23.76cm usable height
          
          // Calculate maximum labels per row with dynamic spacing
          const calculateMaxLabelsPerRow = (labelWidth: number) => {
            if (labelWidth >= usableWidthCm) return 1; // Single label if too wide
            
            // Try to fit as many labels as possible with minimum spacing
            let maxLabels = 1;
            const minSpacing = 0.1; // Minimum 1mm spacing
            
            for (let labels = 2; labels <= 50; labels++) {
              const totalLabelWidth = labels * labelWidth;
              const requiredSpacing = (labels - 1) * minSpacing;
              const totalWidth = totalLabelWidth + requiredSpacing;
              
              if (totalWidth <= usableWidthCm) {
                maxLabels = labels;
              } else {
                break;
              }
            }
            
            return maxLabels;
          };
          
          // Calculate maximum labels per column with dynamic spacing
          const calculateMaxLabelsPerCol = (labelHeight: number) => {
            if (labelHeight >= usableHeightCm) return 1; // Single label if too tall
            
            let maxLabels = 1;
            const minSpacing = 0.1; // Minimum 1mm spacing
            
            for (let labels = 2; labels <= 20; labels++) {
              const totalLabelHeight = labels * labelHeight;
              const requiredSpacing = (labels - 1) * minSpacing;
              const totalHeight = totalLabelHeight + requiredSpacing;
              
              if (totalHeight <= usableHeightCm) {
                maxLabels = labels;
              } else {
                break;
              }
            }
            
            return maxLabels;
          };
          
          const maxLabelsPerRow = calculateMaxLabelsPerRow(labelDimensions.width);
          const maxLabelsPerCol = calculateMaxLabelsPerCol(labelDimensions.height);
          const maxPerPage = maxLabelsPerRow * maxLabelsPerCol;
          
          // Calculate dynamic spacing
          const horizontalSpacing = maxLabelsPerRow > 1 ? 
            (usableWidthCm - (maxLabelsPerRow * labelDimensions.width)) / (maxLabelsPerRow - 1) : 0;
          const verticalSpacing = maxLabelsPerCol > 1 ? 
            (usableHeightCm - (maxLabelsPerCol * labelDimensions.height)) / (maxLabelsPerCol - 1) : 0;

          // Calculate total pages needed
          const totalPages = Math.ceil(count / maxPerPage);

          // Generate only non-empty pages
          const pages = [];
          for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            const startIndex = pageIndex * maxPerPage;
            const endIndex = Math.min(startIndex + maxPerPage, count);
            const labelsOnThisPage = endIndex - startIndex;
            
            // Only include pages with labels
            if (labelsOnThisPage > 0) {
              pages.push({
                pageIndex,
                startIndex,
                endIndex,
                labelsOnThisPage,
                isLastPage: pageIndex === totalPages - 1
              });
            }
          }

          return (
            <>
              {pages.map(({ pageIndex, startIndex, labelsOnThisPage, isLastPage }) => {
                
                // Calculate actual grid dimensions for this page
                const actualCols = Math.min(maxLabelsPerRow, labelsOnThisPage);
                const actualRows = Math.ceil(labelsOnThisPage / actualCols);
                
                return (
                  <div key={pageIndex} className={`print-page ${!isLastPage ? 'print-break' : ''}`}>
                    <div
                      className="print-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${actualCols}, ${labelDimensions.width}cm)`,
                        gridTemplateRows: `repeat(${actualRows}, ${labelDimensions.height}cm)`,
                        gap: `${verticalSpacing}cm ${horizontalSpacing}cm`,
                        justifyContent: 'start',
                        alignContent: 'start',
                        padding: 0,
                        margin: 0,
                        pageBreakInside: 'avoid',
                        width: `${usableWidthCm}cm`,
                        minHeight: `${usableHeightCm}cm`,
                        height: 'auto'
                      }}
                    >
                      {Array.from({ length: labelsOnThisPage }).map((__, i) => (
                        <div
                          key={startIndex + i}
                          className="print-label"
                          style={{
                            width: `${labelDimensions.width}cm`,
                            height: `${labelDimensions.height}cm`,
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid',
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
                              textColor={textColor}
                              textPosition={textPosition}
                              textSize={textSize}
                              labelDimensions={labelDimensions}
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
            justify-content: start !important;
            align-content: start !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            width: 16.8cm !important;
            min-height: 23.76cm !important;
            height: auto !important;
          }
          .print-page {
            width: 100% !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
          }
          .print-page.print-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          /* Windows-specific fixes */
          @media print {
            .print-page {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-page.print-break {
              page-break-after: always !important;
              break-after: page !important;
              -webkit-break-after: page !important;
            }
          }
          .print-label {
            width: ${labelDimensions.width}cm !important;
            height: ${labelDimensions.height}cm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
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
            filter: drop-shadow(0 0 30px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 60px rgba(0, 0, 0, 0.3)) drop-shadow(0 0 90px rgba(0, 0, 0, 0.2)) drop-shadow(0 0 120px rgba(0, 0, 0, 0.15)) !important;
            opacity: 1 !important;
          }
          @page {
            margin: 2.97cm 2.1cm;
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
