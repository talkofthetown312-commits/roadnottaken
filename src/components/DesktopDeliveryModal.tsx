import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Laptop,
  Download,
  Command,
  Keyboard,
  Tv,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Terminal,
  FolderArchive,
  X,
  Copy,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  Maximize2,
  Printer
} from 'lucide-react';

interface DesktopDeliveryModalProps {
  onClose: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const DesktopDeliveryModal: React.FC<DesktopDeliveryModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'windows' | 'macos' | 'pwa' | 'shortcuts'>('windows');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const APP_URL = 'https://ais-pre-babxvblqn6eoky52glnhsu-656316083606.asia-southeast1.run.app';

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallDesktopPWA = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert("To install as a native desktop app on Windows or macOS:\n1. Click the 'App available' (install) icon in your browser address bar (top right in Chrome/Edge).\n2. Or click the browser menu (⋮) -> 'Cast, save, and share' -> 'Install Talk of the Town POS'.\n\nIt will appear in your Windows Start Menu or macOS Launchpad/Dock!");
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(APP_URL);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Deliver Desktop Application</h3>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
                  Windows & macOS
                </span>
              </div>
              <p className="text-xs text-slate-400">Talk of the Town POS · Enterprise Cross-Platform Client</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('windows')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'windows'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Windows (.zip / .bat)</span>
          </button>

          <button
            onClick={() => setActiveTab('macos')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'macos'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>macOS (.app / .zip)</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pwa'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Desktop PWA</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'shortcuts'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Shortcuts & CFD</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-5">
          {/* TAB 1: WINDOWS */}
          {activeTab === 'windows' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-blue-950">talk-of-the-town-pos-windows.zip</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-200 text-blue-900 rounded">v1.0.0 Windows</span>
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Complete Windows Desktop application package with single-click <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">Launch-POS.bat</code>, silent kiosk thermal printing, dual-screen customer display support, and full offline storage.
                  </p>
                </div>
                <a
                  href="/download/talk-of-the-town-pos-windows.zip"
                  download="talk-of-the-town-pos-windows.zip"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Windows App</span>
                </a>
              </div>

              {/* Windows Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Printer className="w-3.5 h-3.5 text-blue-600" />
                    <span>Thermal Printing</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Direct ESC/POS receipt & KOT printing via USB or LAN with auto-cut support.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Tv className="w-3.5 h-3.5 text-blue-600" />
                    <span>Customer Facing (CFD)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Auto-detects secondary monitor to show live cart totals and payment QR.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Keyboard className="w-3.5 h-3.5 text-blue-600" />
                    <span>POS Accelerators</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    F1-F12 keyboard shortcuts for high-speed cashiers punching bills.
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                <strong className="text-slate-900 font-semibold block">Quick 2-Step Windows Setup:</strong>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                  <li>Extract the downloaded <code className="font-mono text-slate-800">talk-of-the-town-pos-windows.zip</code>.</li>
                  <li>Double-click <code className="font-mono text-blue-700 font-bold">Launch-POS.bat</code> to launch the standalone desktop app.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: MACOS */}
          {activeTab === 'macos' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-100 rounded-xl border border-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">talk-of-the-town-pos-macos.zip</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-300 text-slate-900 rounded">macOS Universal</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Native macOS application bundle (<code className="font-mono">TalkOfTheTown.app</code>) optimized for Apple Silicon (M1/M2/M3/M4) and Intel Macs, featuring native menu bar integration and retina support.
                  </p>
                </div>
                <a
                  href="/download/talk-of-the-town-pos-macos.zip"
                  download="talk-of-the-town-pos-macos.zip"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download macOS App</span>
                </a>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <strong className="font-semibold block">macOS Installation Tip:</strong>
                <p className="leading-relaxed text-[11px]">
                  Drag <code className="font-mono font-bold">TalkOfTheTown.app</code> into your <strong>/Applications</strong> folder. If Gatekeeper displays an "Unverified developer" notice upon first launch, right-click the app and choose <strong>Open</strong>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: INSTANT DESKTOP PWA */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-xs text-indigo-950">
                <div className="flex items-center gap-2 font-bold text-sm text-indigo-900">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Zero-Install Progressive Desktop Application</span>
                </div>
                <p className="leading-relaxed">
                  Both <strong>Microsoft Edge</strong> and <strong>Google Chrome</strong> natively install this web app as a high-performance desktop application directly into your Windows Start Menu, Taskbar, or macOS Dock.
                </p>
              </div>

              <div className="p-5 border border-slate-200 rounded-xl space-y-3 bg-white text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Install Desktop App in Current Browser</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isInstalled
                        ? 'App is currently running in standalone desktop mode.'
                        : 'Click below to install as a desktop window application.'}
                    </p>
                  </div>
                  <button
                    onClick={handleInstallDesktopPWA}
                    disabled={isInstalled}
                    className={`px-5 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0 ${
                      isInstalled
                        ? 'bg-slate-200 text-slate-500 cursor-default'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    <span>{isInstalled ? 'Installed as App' : 'Install Desktop App'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Separate Window without URL Bar</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Pin to Taskbar & Dock</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Offline SQLite Edge Sync</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KEYBOARD SHORTCUTS & CFD */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-slate-700" />
                  <span>ERP & POS Keyboard Shortcuts (Active Now)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Cashier POS</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">F1</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Self-Order Kiosk</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">F2</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Floor & Tables</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">F3</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Kitchen KDS</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">F4</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Edge Data Sync</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">F5</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Stock & Recipe BOM</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">F6</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">PO & Inwarding</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">F7</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Staff & Payroll</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">F8</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Shift & Z-Report</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">F9</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Rule Book / SOP</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">F10</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Fullscreen Kiosk</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">F11</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-slate-600">Shortcuts Help</span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px] text-slate-800 shadow-2xs">?</kbd>
                  </div>
                </div>
              </div>

              {/* Dual-Screen Customer Facing Display */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Tv className="w-4 h-4 text-blue-600" />
                  <span>Dual-Monitor Customer Facing Display (CFD)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  In a cashier setup with an external customer pole display or HDMI monitor, set Windows display mode to <strong>"Extend"</strong>. The desktop app displays the active cashier terminal on Monitor 1, and projects live itemized billing and dynamic UPI QR on Monitor 2.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Cross-platform: Windows, macOS, Android, iOS, Web
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
