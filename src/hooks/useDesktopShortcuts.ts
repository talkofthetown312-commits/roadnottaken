import { useEffect } from 'react';
import { ActiveTab } from '../components/TopBar';

interface UseDesktopShortcutsOptions {
  onTabChange: (tab: ActiveTab) => void;
  onOpenSettings?: () => void;
  onOpenDesktopModal?: () => void;
  onTriggerSync?: () => void;
}

export function useDesktopShortcuts({
  onTabChange,
  onOpenSettings,
  onOpenDesktopModal,
  onTriggerSync,
}: UseDesktopShortcutsOptions) {
  useEffect(() => {
    // 1. Electron Native IPC Listeners
    const desktopAPI = (window as any).desktopAPI;
    if (desktopAPI) {
      if (desktopAPI.onNavigateTab) {
        desktopAPI.onNavigateTab((tab: ActiveTab) => onTabChange(tab));
      }
      if (desktopAPI.onTriggerSync && onTriggerSync) {
        desktopAPI.onTriggerSync(() => onTriggerSync());
      }
      if (desktopAPI.onShowShortcuts && onOpenDesktopModal) {
        desktopAPI.onShowShortcuts(() => onOpenDesktopModal());
      }
    }

    // 2. Global Keyboard Accelerator Handler (Cross-Platform)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing inside an input/textarea
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // F-Keys function regardless of input focus (standard ERP behavior)
      switch (e.key) {
        case 'F1':
          e.preventDefault();
          onTabChange('cashier');
          break;
        case 'F2':
          e.preventDefault();
          onTabChange('kiosk');
          break;
        case 'F3':
          e.preventDefault();
          onTabChange('tables');
          break;
        case 'F4':
          e.preventDefault();
          onTabChange('kds');
          break;
        case 'F5':
          // Allow Ctrl+F5 or Plain F5 for sync
          if (e.ctrlKey || e.metaKey) return; // normal browser hard reload
          e.preventDefault();
          if (onTriggerSync) onTriggerSync();
          break;
        case 'F6':
          e.preventDefault();
          onTabChange('inventory');
          break;
        case 'F7':
          e.preventDefault();
          onTabChange('procurement');
          break;
        case 'F8':
          e.preventDefault();
          onTabChange('salary');
          break;
        case 'F9':
          e.preventDefault();
          onTabChange('shifts');
          break;
        case 'F10':
          e.preventDefault();
          onTabChange('rules');
          break;
        case 'F11':
          // Fullscreen toggle
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
          break;
        case 'F12':
          if (!isInput && onOpenDesktopModal) {
            e.preventDefault();
            onOpenDesktopModal();
          }
          break;
        default:
          break;
      }

      // Modifier key combos (Ctrl / Cmd)
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'comma' && onOpenSettings) {
          e.preventDefault();
          onOpenSettings();
        }
      }

      // Help key '?' when not typing in text field
      if (e.key === '?' && !isInput && onOpenDesktopModal) {
        e.preventDefault();
        onOpenDesktopModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTabChange, onOpenSettings, onOpenDesktopModal, onTriggerSync]);
}
