/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    window: {
      getPosition: () => Promise<{ x: number; y: number }>;
      setPosition: (x: number, y: number) => Promise<void>;
      getBounds: () => Promise<{ x: number; y: number; width: number; height: number }>;
    };
    menu: {
      show: () => Promise<void>;
    };
    app: {
      quit: () => Promise<void>;
    };
    notification: {
      show: (options: { title: string; body: string }) => Promise<void>;
    };
    onStateChange: (callback: (state: string) => void) => void;
    onWaterDrink: (callback: () => void) => void;
    onWaterSetInterval: (callback: (minutes: number) => void) => void;
    onWaterToggle: (callback: () => void) => void;
    onShowQuickInput: (callback: () => void) => void;
    onShowLibrary: (callback: () => void) => void;
    onFocusSearch: (callback: () => void) => void;
    onSaveInspirationData: (callback: (data: any) => void) => void;
    onRequestInspirationData: (callback: (senderId: number) => void) => void;
    onToggleFavorite: (callback: (id: string) => void) => void;
    sendInspirationData: (senderId: number, data: any) => void;
  };
}
