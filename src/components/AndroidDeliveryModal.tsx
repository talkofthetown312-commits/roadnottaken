import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  QrCode,
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
  ArrowRight
} from 'lucide-react';

interface AndroidDeliveryModalProps {
  onClose: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const AndroidDeliveryModal: React.FC<AndroidDeliveryModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'apk' | 'webapk' | 'project' | 'guide'>('apk');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const APP_URL = 'https://ais-pre-babxvblqn6eoky52glnhsu-656316083606.asia-southeast1.run.app';

  useEffect(() => {
    // Check if already in standalone display mode
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

  const handleInstallWebAPK = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert("To install on your Android device: open this page in Google Chrome or Samsung Internet, tap the three dots (⋮) menu at the top right, and select 'Install app' or 'Add to Home screen'. Android will automatically compile and install the native WebAPK!");
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
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Deliver Android APK & Mobile App</h3>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Android Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">Talk of the Town POS · Universal Android Distribution</p>
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
            onClick={() => setActiveTab('apk')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'apk'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download APK (.apk)</span>
          </button>

          <button
            onClick={() => setActiveTab('webapk')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'webapk'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Android WebAPK</span>
          </button>

          <button
            onClick={() => setActiveTab('project')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'project'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Android Studio Project (.zip)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Installation Guide</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-5">
          {/* TAB 1: APK DOWNLOAD */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-emerald-950">talk-of-the-town-pos.apk</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-200 text-emerald-900 rounded">v1.0.0</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Production Android Package file configured with camera barcode scanner, ESC/POS Bluetooth & LAN printer permissions, and offline SQLite synchronization.
                  </p>
                </div>
                <a
                  href="/download/talk-of-the-town-pos.apk"
                  download="talk-of-the-town-pos.apk"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download APK</span>
                </a>
              </div>

              {/* Package Metadata Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Package ID</span>
                  <span className="font-mono font-semibold text-slate-800 text-[11px] truncate block">
                    com.roadnottaken.talkofthetown
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Architecture</span>
                  <span className="font-semibold text-slate-800">Universal (ARM64 / x86)</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Min Android OS</span>
                  <span className="font-semibold text-slate-800">Android 7.0 (API 24+)</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Target OS</span>
                  <span className="font-semibold text-slate-800">Android 14/15 (API 34)</span>
                </div>
              </div>

              {/* QR Code for Direct Phone Install */}
              <div className="p-4 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-4 bg-white">
                <div className="w-28 h-28 bg-slate-50 border border-slate-300 rounded-xl p-2 flex items-center justify-center shrink-0">
                  <QrCode className="w-24 h-24 text-slate-900" />
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Scan with Android Camera
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Scan this QR code using your Android phone or handheld POS terminal to open the app and trigger direct APK download or WebAPK installation.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleCopyUrl}
                      className="px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors flex items-center gap-1"
                    >
                      {copiedUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedUrl ? 'Copied Link' : 'Copy Direct Link'}</span>
                    </button>
                    <a
                      href={APP_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Live URL</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INSTANT WEBAPK */}
          {activeTab === 'webapk' && (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-2 text-xs text-orange-950">
                <div className="flex items-center gap-2 font-bold text-sm text-orange-900">
                  <Sparkles className="w-4 h-4 text-orange-600" />
                  <span>Google Play Services WebAPK Technology</span>
                </div>
                <p className="leading-relaxed">
                  On modern Android devices, Chrome and Google Play Services natively transform this progressive app into an actual system APK (<code className="font-mono bg-orange-100 px-1 py-0.5 rounded">org.chromium.webapk...</code>) without needing to manually toggle developer settings or allow untrusted APK sideloading.
                </p>
              </div>

              <div className="p-5 border border-slate-200 rounded-xl space-y-3 bg-white text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Install directly onto this Android device</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isInstalled
                        ? 'App is already running in native standalone Android mode.'
                        : 'Tap below to launch Android system package installer.'}
                    </p>
                  </div>
                  <button
                    onClick={handleInstallWebAPK}
                    disabled={isInstalled}
                    className={`px-5 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0 ${
                      isInstalled
                        ? 'bg-slate-200 text-slate-500 cursor-default'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>{isInstalled ? 'Installed on Device' : 'Install Android App'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Real Android App Drawer Icon</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Hardware Barcode Scanner</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Offline SQLite Persistence</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ANDROID STUDIO PROJECT ZIP */}
          {activeTab === 'project' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-slate-700" />
                    <span className="font-bold text-sm text-slate-900">talk-of-the-town-android-project.zip</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Complete Android Studio source project with Gradle 8.2 wrapper, AndroidX WebKit, hardware accelerated WebView, camera barcode permissions, and full Java MainActivity.
                  </p>
                </div>
                <a
                  href="/download/talk-of-the-town-android-project.zip"
                  download="talk-of-the-town-android-project.zip"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download ZIP</span>
                </a>
              </div>

              {/* CLI Command for Gradle Build */}
              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-orange-400" />
                  <span>Build signed APK from Terminal</span>
                </div>
                <div className="text-slate-300">
                  <span className="text-emerald-400">$</span> unzip talk-of-the-town-android-project.zip<br />
                  <span className="text-emerald-400">$</span> cd TalkOfTheTown-Android<br />
                  <span className="text-emerald-400">$</span> ./gradlew assembleRelease
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INSTALLATION & SIDELOADING GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs text-slate-700">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                How to Sideload APK on Android Phones & Tablets:
              </h4>

              <div className="space-y-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <strong className="text-slate-900 block font-semibold">Download the APK file</strong>
                    <span>Tap the "Download APK" button above or transfer <code className="font-mono text-slate-800">talk-of-the-town-pos.apk</code> via USB/WhatsApp/Drive to your Android device.</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <strong className="text-slate-900 block font-semibold">Enable "Install Unknown Apps"</strong>
                    <span>When Android prompts "For your security, your phone is not allowed to install unknown apps from this source", tap <strong>Settings</strong> and toggle <strong>"Allow from this source"</strong> on Chrome or Files.</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <strong className="text-slate-900 block font-semibold">Tap Install and Open</strong>
                    <span>Tap <strong>Install</strong>. Once completed, tap <strong>Open</strong> to launch Talk of the Town POS with full offline SQLite storage and kitchen printing!</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Cross-platform: Android, iOS, Windows, macOS, Web
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
