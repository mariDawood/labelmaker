"use client";
import React, { useMemo, useRef, useState, useEffect, forwardRef } from "react";

export type BackgroundPattern = "none" | "dots" | "grid" | "diagonal";

export interface LabelPreviewProps {
  text: string;
  logoColor: string;
  pattern: BackgroundPattern;
  patternColor: string;
  textColor: string;
  textPosition?: { x: number; y: number };
  textSize?: { width: number; height: number; fontSize: number };
  labelDimensions?: { width: number; height: number }; // cm
  onTextPositionChange?: (position: { x: number; y: number }) => void;
  onTextSizeChange?: (size: { width: number; height: number; fontSize: number }) => void;
  className?: string;
  forceScale?: number; // Override automatic scaling for consistent rendering
}

const LabelPreview = forwardRef<HTMLDivElement, LabelPreviewProps>((props, ref) => {
  const { text, logoColor, pattern, patternColor, textColor, className, forceScale } = props;
  const textPosition = props.textPosition || { x: 50, y: 50 };
  const textSize = props.textSize || { width: 200, height: 80, fontSize: 24 };
  const labelDimensions = props.labelDimensions || { width: 6, height: 4 }; // Default 6x4 cm
  const { onTextPositionChange, onTextSizeChange } = props;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'se' | 'sw' | 'ne' | 'nw'>('se');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 600, height: 450 }); // Default design page size
  
  const isInteractive = onTextPositionChange && onTextSizeChange;
  
  // Track container size for scaling
  useEffect(() => {
    if (containerRef.current) {
      const updateSize = () => {
        const rect = containerRef.current!.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      };
      
      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);
  
  // Calculate scaling factor based on container size (design page is ~600px wide)
  // Or use forced scale for consistent rendering across different contexts
  const scaleFactor = forceScale ?? (containerSize.width / 600);

  // Calculate optimal glow color based on the color scheme
  const getOptimalGlowColor = useMemo(() => {
    const hexToRgb = (hex: string) => {
      const clean = hex.replace("#", "");
      const bigint = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
      };
    };

    const getLuminance = (r: number, g: number, b: number) => {
      // Convert to linear RGB
      const toLinear = (val: number) => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };

    const logoRgb = hexToRgb(logoColor);
    const patternRgb = hexToRgb(patternColor);
    
    // Calculate average luminance of the color scheme
    const logoLuminance = getLuminance(logoRgb.r, logoRgb.g, logoRgb.b);
    const patternLuminance = getLuminance(patternRgb.r, patternRgb.g, patternRgb.b);
    const avgLuminance = (logoLuminance + patternLuminance) / 2;
    
    // Enhanced contrast for better print visibility
    if (avgLuminance > 0.4) {
      // Light background - use darker shadow for better print contrast
      return "rgba(0, 0, 0, 0.4)";
    } else {
      // Dark background - use brighter glow for better print visibility
      return "rgba(255, 255, 255, 0.8)";
    }
  }, [logoColor, patternColor]);

  const patternStyle = useMemo(() => {
    const hexToRgba = (hex: string, alpha: number) => {
      const clean = hex.replace("#", "");
      const bigint = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Scale pattern sizes based on container size
    const dotSize = Math.max(1, 9 * scaleFactor);
    const dotSpacing = Math.max(10, 30 * scaleFactor);
    const gridSize = Math.max(8, 18 * scaleFactor);
    const gridSpacing = Math.max(16, 36 * scaleFactor);
    
    switch (pattern) {
      case "dots":
        return {
          backgroundImage: `radial-gradient(circle, ${hexToRgba(patternColor, 0.55)} ${dotSize}px, transparent ${dotSize}px)`,
          backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
          backgroundPosition: "0 0",
        } as React.CSSProperties;
      case "grid":
        return {
          backgroundImage: `
            repeating-linear-gradient(0deg, ${hexToRgba(patternColor, 0.25)} 0 ${gridSize}px, transparent ${gridSize}px ${gridSpacing}px),
            repeating-linear-gradient(90deg, ${hexToRgba(patternColor, 0.25)} 0 ${gridSize}px, transparent ${gridSize}px ${gridSpacing}px),
            repeating-linear-gradient(0deg, ${hexToRgba(patternColor, 0.5)} 0 ${gridSize}px, transparent ${gridSize}px ${gridSpacing}px),
            repeating-linear-gradient(90deg, ${hexToRgba(patternColor, 0.5)} 0 ${gridSize}px, transparent ${gridSize}px ${gridSpacing}px)
          `,
          backgroundSize: `${gridSpacing}px ${gridSpacing}px, ${gridSpacing}px ${gridSpacing}px, ${gridSpacing}px ${gridSpacing}px, ${gridSpacing}px ${gridSpacing}px`,
          backgroundPosition: `0 0, 0 0, 0 ${gridSize}px, ${gridSize}px 0`,
          color: patternColor,
        } as React.CSSProperties;
      case "diagonal":
        return {
          backgroundImage: `repeating-linear-gradient(45deg, ${hexToRgba(patternColor, 0.5)} 0 ${gridSize}px, transparent ${gridSize}px ${gridSpacing}px)`,
          color: patternColor,
        } as React.CSSProperties;
      default:
        return {} as React.CSSProperties;
    }
  }, [pattern, patternColor, scaleFactor]);

  // Decide text shadow palette based on text lightness - shadow for light text, glow for dark text
  const textShadowPalette = useMemo(() => {
    const textHex = textColor;

    const hexToRgb = (hex: string) => {
      const clean = hex.replace('#', '');
      const c = clean.length === 3 ? clean.split('').map((ch) => ch + ch).join('') : clean;
      const num = parseInt(c, 16);
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    };
    const luminance = (r: number, g: number, b: number) => {
      const toLinear = (v: number) => {
        v = v / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };

    const t = hexToRgb(textHex);
    const textLum = luminance(t.r, t.g, t.b);
    
    // Determine if text is light or dark based on luminance threshold
    const isLightText = textLum > 0.5;
    
    const clamp = (v: number) => Math.max(0, Math.min(1, v));

    // For light text: use dark shadow effect
    // For dark text: use light glow effect
    if (isLightText) {
      // Shadow effect for light text - darker, more directional
      const shadowAlpha = 0.6;
      const shadowSoftAlpha = 0.4;
      
      return {
        isShadow: true,
        effects: [
          `0 2px ${4 * scaleFactor}px rgba(0, 0, 0, ${clamp(shadowAlpha)})`, // Main shadow
          `0 4px ${8 * scaleFactor}px rgba(0, 0, 0, ${clamp(shadowSoftAlpha)})`, // Soft shadow
          `0 1px ${2 * scaleFactor}px rgba(0, 0, 0, ${clamp(shadowAlpha + 0.2)})`, // Sharp shadow
        ]
      };
    } else {
      // Glow effect for dark text - lighter, more spread out
      const glowAlpha = 0.7;
      const glowSoftAlpha = 0.5;
      
      return {
        isShadow: false,
        effects: [
          `0 0 ${6 * scaleFactor}px rgba(255, 255, 255, ${clamp(glowAlpha)})`, // Main glow
          `0 0 ${12 * scaleFactor}px rgba(255, 255, 255, ${clamp(glowSoftAlpha)})`, // Soft glow
          `0 0 ${18 * scaleFactor}px rgba(255, 255, 255, ${clamp(glowSoftAlpha - 0.1)})`, // Outer glow
        ]
      };
    }
  }, [textColor, scaleFactor]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isInteractive || !containerRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    
    const rect = containerRef.current.getBoundingClientRect();
    // Account for centered positioning - textPosition now represents center, not top-left
    const textPixelX = (textPosition.x / 100) * rect.width;
    const textPixelY = (textPosition.y / 100) * rect.height;
    
    setDragStart({ 
      x: e.clientX - rect.left - textPixelX, 
      y: e.clientY - rect.top - textPixelY 
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && containerRef.current && onTextPositionChange) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - dragStart.x - rect.left) / rect.width) * 100;
      const y = ((e.clientY - dragStart.y - rect.top) / rect.height) * 100;
      
      // Account for centered positioning and scaling - ensure text doesn't go beyond edges
      const scaledWidth = textSize.width * scaleFactor;
      const scaledHeight = textSize.height * scaleFactor;
      const halfWidthPercent = (scaledWidth / rect.width / 2) * 100;
      const halfHeightPercent = (scaledHeight / rect.height / 2) * 100;
      
      onTextPositionChange({
        x: Math.max(halfWidthPercent, Math.min(x, 100 - halfWidthPercent)),
        y: Math.max(halfHeightPercent, Math.min(y, 100 - halfHeightPercent))
      });
    }
    
    if (isResizing && containerRef.current && onTextSizeChange) {
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = (e.clientX - dragStart.x) / scaleFactor;
      const deltaY = (e.clientY - dragStart.y) / scaleFactor;
      
      let newWidth = textSize.width;
      let newHeight = textSize.height;
      
      // Apply delta based on resize direction
      switch (resizeDirection) {
        case 'se': // Bottom-right: both axes positive
          newWidth = Math.max(50, textSize.width + deltaX);
          newHeight = Math.max(30, textSize.height + deltaY);
          break;
        case 'sw': // Bottom-left: X negative, Y positive
          newWidth = Math.max(50, textSize.width - deltaX);
          newHeight = Math.max(30, textSize.height + deltaY);
          break;
        case 'ne': // Top-right: X positive, Y negative
          newWidth = Math.max(50, textSize.width + deltaX);
          newHeight = Math.max(30, textSize.height - deltaY);
          break;
        case 'nw': // Top-left: both axes negative
          newWidth = Math.max(50, textSize.width - deltaX);
          newHeight = Math.max(30, textSize.height - deltaY);
          break;
      }
      
      const newFontSize = Math.max(10, Math.min(48, Math.round(newWidth / 8)));
      
      onTextSizeChange({
        width: newWidth,
        height: newHeight,
        fontSize: newFontSize
      });
      
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleResize = (e: React.MouseEvent, direction: 'se' | 'sw' | 'ne' | 'nw') => {
    if (!isInteractive) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      ref={(el) => {
        containerRef.current = el;
        if (ref && typeof ref === 'function') {
          ref(el);
        } else if (ref && 'current' in ref) {
          ref.current = el;
        }
      }}
      className={"relative rounded-lg border " + (className ?? "")}
      style={{ backgroundColor: "#ffffff", ...patternStyle }}
      data-label-container="true"
      onMouseMove={isInteractive ? handleMouseMove : undefined}
      onMouseUp={isInteractive ? handleMouseUp : undefined}
      onMouseLeave={isInteractive ? handleMouseUp : undefined}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Glow container with drop-shadow - larger to accommodate glow effect */}
        <div 
          className="absolute w-full h-full flex items-center justify-center"
          style={{
            filter: `drop-shadow(0 0 30px ${getOptimalGlowColor}) drop-shadow(0 0 60px ${getOptimalGlowColor.replace(/[\d.]+\)$/, '0.6)')}) drop-shadow(0 0 90px ${getOptimalGlowColor.replace(/[\d.]+\)$/, '0.4)')}) drop-shadow(0 0 120px ${getOptimalGlowColor.replace(/[\d.]+\)$/, '0.2)')})`
          }}
        >
          <RecoloredLogo color="white" className="w-[85%] h-[85%]" />
        </div>
        {/* Main logo */}
        <RecoloredLogo color={logoColor} className="relative w-[85%] h-[85%] z-10" />
        
        {/* Text Box */}
        <div
          ref={textRef}
          className={`absolute z-20 ${
            isInteractive ? 
              `border-2 border-dashed cursor-move ${
                isDragging ? "border-blue-500 bg-blue-50/20" : "border-transparent hover:border-blue-300 hover:bg-blue-50/10"
              }` : ""
          }`}
          style={{
            left: `${textPosition.x}%`,
            top: `${textPosition.y}%`,
            width: `${textSize.width * scaleFactor}px`,
            height: `${textSize.height * scaleFactor}px`,
            transform: 'translate(-50%, -50%)',
          }}
          onMouseDown={isInteractive ? handleMouseDown : undefined}
        >
          <div 
            className="w-full h-full flex items-center justify-center text-center font-bold tracking-wide whitespace-pre-wrap"
            style={{ 
              color: textColor,
              fontSize: `${textSize.fontSize * scaleFactor}px`,
              lineHeight: '1.2',
              padding: `${2 * scaleFactor}px`,
              textShadow: textShadowPalette.effects.join(', ')
            }}
          >
            {text}
          </div>
          
          {/* Resize handles - only show when interactive */}
          {isInteractive && (
            <>
              <div 
                className="absolute bg-blue-500 rounded cursor-se-resize"
                style={{
                  bottom: `${-2 * scaleFactor}px`,
                  right: `${-2 * scaleFactor}px`,
                  width: `${Math.max(8, 16 * scaleFactor)}px`,
                  height: `${Math.max(8, 16 * scaleFactor)}px`,
                }}
                onMouseDown={(e) => handleResize(e, 'se')}
              />
              <div 
                className="absolute bg-blue-500 rounded cursor-ne-resize"
                style={{
                  top: `${-2 * scaleFactor}px`,
                  right: `${-2 * scaleFactor}px`,
                  width: `${Math.max(8, 16 * scaleFactor)}px`,
                  height: `${Math.max(8, 16 * scaleFactor)}px`,
                }}
                onMouseDown={(e) => handleResize(e, 'ne')}
              />
              <div 
                className="absolute bg-blue-500 rounded cursor-sw-resize"
                style={{
                  bottom: `${-2 * scaleFactor}px`,
                  left: `${-2 * scaleFactor}px`,
                  width: `${Math.max(8, 16 * scaleFactor)}px`,
                  height: `${Math.max(8, 16 * scaleFactor)}px`,
                }}
                onMouseDown={(e) => handleResize(e, 'sw')}
              />
              <div 
                className="absolute bg-blue-500 rounded cursor-nw-resize"
                style={{
                  top: `${-2 * scaleFactor}px`,
                  left: `${-2 * scaleFactor}px`,
                  width: `${Math.max(8, 16 * scaleFactor)}px`,
                  height: `${Math.max(8, 16 * scaleFactor)}px`,
                }}
                onMouseDown={(e) => handleResize(e, 'nw')}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
});

LabelPreview.displayName = "LabelPreview";

export default LabelPreview;

export function RecoloredLogo(props: { color: string; className?: string }) {
  const { color, className } = props;
  return (
    <div
      className={className}
      style={{
        WebkitMaskImage: "url(/label.svg)",
        maskImage: "url(/label.svg)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        backgroundColor: color,
      }}
    />
  );
}




