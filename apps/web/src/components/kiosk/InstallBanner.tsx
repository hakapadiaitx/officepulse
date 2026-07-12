"use client";
import { useState, useEffect } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    setIsIOS(/ipad|iphone|ipod/i.test(navigator.userAgent) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setPrompt(null);
  }

  if (isStandalone || dismissed) return null;
  if (!prompt && !isIOS) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 px-5 py-4 flex items-center gap-4 w-[calc(100%-3rem)] max-w-sm">
      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
        <Download className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Install OfficePulse</p>
        {isIOS ? (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            Tap <Share className="w-3 h-3 inline mx-0.5" /> then <strong>Add to Home Screen</strong>
          </p>
        ) : (
          <p className="text-xs text-gray-500">Install for full-screen kiosk mode</p>
        )}
      </div>
      {!isIOS && (
        <button
          onClick={install}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex-shrink-0"
        >
          Install
        </button>
      )}
      <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
