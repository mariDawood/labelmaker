"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LabelPreview, { BackgroundPattern } from "@/components/LabelPreview";
import { PrinterIcon } from "lucide-react";
import { ArrowRightIcon } from "lucide-react";
import { ChevronDownIcon } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [logoColor, setLogoColor] = useState<string>("#8B5CF6");
  const [pattern, setPattern] = useState<BackgroundPattern>("dots");
  const [patternColor, setPatternColor] = useState<string>("#5B21B6");
  const [text, setText] = useState<string>("Appelmoes");
  const [textPosition, setTextPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [textSize, setTextSize] = useState<{ width: number; height: number; fontSize: number }>({ width: 200, height: 80, fontSize: 24 });
  const [isColorThemesOpen, setIsColorThemesOpen] = useState<boolean>(false);

  const handlePrintNavigation = () => {
    // Always use parameter-based approach to avoid html2canvas color issues
    // This preserves the exact design without any rendering problems
    const params = new URLSearchParams({
      text,
      logoColor,
      pattern,
      patternColor,
      textX: textPosition.x.toString(),
      textY: textPosition.y.toString(),
      textWidth: textSize.width.toString(),
      textHeight: textSize.height.toString(),
      textFontSize: textSize.fontSize.toString(),
    });
    
    router.push(`/print?${params.toString()}`);
  };

  const patternStyle = useMemo(() => {
    switch (pattern) {
      case "dots":
        return {
          backgroundImage:
            "radial-gradient(currentColor 1.5px, transparent 1.5px)",
          backgroundSize: "16px 16px",
          color: patternColor,
        } as React.CSSProperties;
      case "grid":
        return {
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          color: patternColor,
        } as React.CSSProperties;
      case "diagonal":
        return {
          backgroundImage:
            "repeating-linear-gradient(45deg, currentColor, currentColor 2px, transparent 2px, transparent 12px)",
          color: patternColor,
        } as React.CSSProperties;
      default:
        return {} as React.CSSProperties;
    }
  }, [pattern, patternColor]);

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <header className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrintNavigation}
          className="rounded-md border px-3 py-2 text-sm hover:bg-foreground hover:text-background flex items-center gap-2"
        >
          <PrinterIcon className="w-4 h-4" />
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8">
          <LabelPreview
            text={text}
            logoColor={logoColor}
            pattern={pattern}
            patternColor={patternColor}
            textPosition={textPosition}
            textSize={textSize}
            onTextPositionChange={setTextPosition}
            onTextSizeChange={setTextSize}
            className="w-full aspect-[4/3]"
          />
        </section>

        <aside className="lg:col-span-4 space-y-8">
          {/* Color Pairs Section */}
          <div className="space-y-4">
            <button 
              onClick={() => setIsColorThemesOpen(!isColorThemesOpen)}
              className="flex items-center justify-between w-full text-left group"
            >
              <h3 className="text-lg font-semibold text-foreground">Color Themes</h3>
              <ChevronDownIcon 
                className={`w-5 h-5 text-foreground/70 transition-transform duration-200 ${
                  isColorThemesOpen ? 'transform rotate-180' : ''
                }`}
              />
            </button>
            <div className={`transition-all duration-300 overflow-hidden ${
              isColorThemesOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { logo: "#8B5CF6", pattern: "#5B21B6", name: "Purple" },
                  { logo: "#EF4444", pattern: "#DC2626", name: "Red" },
                  { logo: "#10B981", pattern: "#059669", name: "Green" },
                  { logo: "#F59E0B", pattern: "#D97706", name: "Orange" },
                  { logo: "#3B82F6", pattern: "#2563EB", name: "Blue" },
                  { logo: "#EC4899", pattern: "#DB2777", name: "Pink" },
                  { logo: "#6366F1", pattern: "#4F46E5", name: "Indigo" },
                  { logo: "#84CC16", pattern: "#65A30D", name: "Lime" },
                  { logo: "#FDE047", pattern: "#EAB308", name: "Amber" }
                ].map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => {
                      setLogoColor(theme.logo);
                      setPatternColor(theme.pattern);
                    }}
                    className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                      logoColor === theme.logo && patternColor === theme.pattern 
                        ? "border-foreground bg-foreground/10" 
                        : "border-foreground/20 bg-foreground/5 hover:border-foreground/30 hover:bg-foreground/10"
                    }`}
                  >
                    <div className="flex gap-2 mb-2">
                      <div 
                        className="w-6 h-6 rounded-full border border-foreground/20"
                        style={{ backgroundColor: theme.logo }}
                      />
                      <div 
                        className="w-6 h-6 rounded-full border border-foreground/20"
                        style={{ backgroundColor: theme.pattern }}
                      />
                    </div>
                    <span className="text-sm font-medium">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Colors Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Logo Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={logoColor}
                    onChange={(e) => setLogoColor(e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border border-foreground/20"
                  />
                  <span className="text-sm text-foreground/70">{logoColor}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Pattern Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={patternColor}
                    onChange={(e) => setPatternColor(e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border border-foreground/20"
                  />
                  <span className="text-sm text-foreground/70">{patternColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pattern Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Background Pattern</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "none", label: "None" },
                { value: "dots", label: "Dots" },
                { value: "grid", label: "Grid" },
                { value: "diagonal", label: "Diagonal" }
              ].map((patternOption) => (
                <button
                  key={patternOption.value}
                  onClick={() => setPattern(patternOption.value as BackgroundPattern)}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                    pattern === patternOption.value ? "border-foreground bg-foreground/10" : "border-foreground/20 bg-foreground/5 hover:border-foreground/30 hover:bg-foreground/10"
                  }`}
                >
                  <div className="w-full h-10 rounded mb-3 border border-foreground/20 bg-background relative overflow-hidden">
                    {patternOption.value === "none" && (
                      <div className="w-full h-full bg-foreground/10" />
                    )}
                    {patternOption.value === "dots" && (
                      <div 
                        className="w-full h-full bg-foreground/5"
                        style={{
                          backgroundImage: "radial-gradient(circle, currentColor 2px, transparent 2px)",
                          backgroundSize: "12px 12px",
                          color: "rgb(107 114 128 / 0.8)"
                        }}
                      />
                    )}
                    {patternOption.value === "grid" && (
                      <div 
                        className="w-full h-full bg-foreground/5"
                        style={{
                          backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
                          backgroundSize: "10px 10px",
                          color: "rgb(107 114 128 / 0.8)"
                        }}
                      />
                    )}
                    {patternOption.value === "diagonal" && (
                      <div 
                        className="w-full h-full bg-foreground/5"
                        style={{
                          backgroundImage: "repeating-linear-gradient(45deg, currentColor, currentColor 2px, transparent 2px, transparent 10px)",
                          color: "rgb(107 114 128 / 0.8)"
                        }}
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium">{patternOption.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text Input Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Label Text</h3>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter label text (press Enter for new lines)"
              rows={3}
              className="w-full rounded-lg border border-foreground/20 bg-background px-4 py-3 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors resize-vertical"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
