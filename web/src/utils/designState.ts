import { BackgroundPattern } from "@/components/LabelPreview";

export interface DesignState {
  text: string;
  logoColor: string;
  pattern: BackgroundPattern;
  patternColor: string;
  textColor: string;
  textPosition: { x: number; y: number };
  textSize: { width: number; height: number; fontSize: number };
}

const STORAGE_KEY = 'labelmaker-design-state';
const REFRESH_KEY = 'labelmaker-refresh-token';

export function saveDesignState(state: DesignState): void {
  try {
    console.log('💾 Saving design state:', state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(REFRESH_KEY, Date.now().toString());
    console.log('✅ Design state saved successfully');
  } catch (error) {
    console.warn('❌ Failed to save design state to localStorage:', error);
  }
}

export function loadDesignState(): DesignState | null {
  try {
    console.log('📖 Loading design state...');
    const saved = localStorage.getItem(STORAGE_KEY);
    console.log('📄 Raw saved data:', saved);
    
    if (!saved) {
      console.log('❌ No saved data found');
      return null;
    }
    
    const parsed = JSON.parse(saved);
    console.log('🔍 Parsed data:', parsed);
    
    // Validate the structure
    if (
      typeof parsed.text === 'string' &&
      typeof parsed.logoColor === 'string' &&
      ['none', 'dots', 'grid', 'diagonal'].includes(parsed.pattern) &&
      typeof parsed.patternColor === 'string' &&
      typeof parsed.textColor === 'string' &&
      typeof parsed.textPosition === 'object' &&
      typeof parsed.textPosition.x === 'number' &&
      typeof parsed.textPosition.y === 'number' &&
      typeof parsed.textSize === 'object' &&
      typeof parsed.textSize.width === 'number' &&
      typeof parsed.textSize.height === 'number' &&
      typeof parsed.textSize.fontSize === 'number'
    ) {
      console.log('✅ Valid design state loaded:', parsed);
      return parsed as DesignState;
    }
    
    console.log('❌ Invalid design state structure');
    return null;
  } catch (error) {
    console.warn('❌ Failed to load design state from localStorage:', error);
    return null;
  }
}

export function clearDesignState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch (error) {
    console.warn('Failed to clear design state from localStorage:', error);
  }
}

// Function to detect hard refresh and clear state
export function setupHardRefreshDetection(): void {
  if (typeof window === 'undefined') return;
  
  // Set a flag when the page is about to unload
  window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('page-refreshing', 'true');
  });
  
  // Check if this is a hard refresh
  const isRefreshing = sessionStorage.getItem('page-refreshing');
  if (isRefreshing) {
    // This is a hard refresh - clear the saved state
    clearDesignState();
    sessionStorage.removeItem('page-refreshing');
  }
}

// Default design state
export const defaultDesignState: DesignState = {
  text: "Appelmoes",
  logoColor: "#6B46C1", // Slightly darker purple for better print contrast
  pattern: "dots",
  patternColor: "#4C1D95", // Darker purple for better contrast
  textColor: "#4C1D95", // Default to same as pattern color
  textPosition: { x: 50, y: 50 },
  textSize: { width: 200, height: 80, fontSize: 24 }
};
