import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

interface ShareDialogProps {
  missionId: string;
  open: boolean;
  onClose: () => void;
}

export default function ShareDialog({ missionId, open, onClose }: ShareDialogProps) {
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const status = await api.missions.getShareStatus(missionId);
      setShareEnabled(status.shareEnabled);
      setShareToken(status.shareToken);
    } catch {
      // ignore
    }
  }, [missionId]);

  useEffect(() => {
    if (open) {
      fetchStatus();
    }
  }, [open, fetchStatus]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (shareEnabled) {
        await api.missions.disableSharing(missionId);
        setShareEnabled(false);
        setShareToken(null);
      } else {
        const result = await api.missions.enableSharing(missionId);
        setShareEnabled(true);
        setShareToken(result.shareToken);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = shareToken ? `${window.location.origin}/shared/${shareToken}` : "";

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-military-800 border border-military-700/50 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-100 tracking-tight">Share Mission</h2>
          <button
            onClick={onClose}
            className="text-military-400 hover:text-gray-100 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            x
          </button>
        </div>

        {/* Warning */}
        <div className="bg-accent-600/10 border border-accent-600/30 rounded-lg px-4 py-3 mb-5">
          <p className="text-accent-400 text-xs font-semibold uppercase tracking-wide mb-1">
            Security Notice
          </p>
          <p className="text-accent-300/80 text-xs leading-relaxed">
            Shared links allow anyone with the URL to view this mission's details,
            including waypoints, threats, weather, and crew information.
            Only share with authorized personnel.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-medium text-gray-200">Enable sharing</p>
            <p className="text-xs text-military-400 mt-0.5">
              Generate a read-only link for this mission
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              shareEnabled ? "bg-command-500" : "bg-military-600"
            } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                shareEnabled ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Share URL */}
        {shareEnabled && shareToken && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-military-400 uppercase tracking-wide font-semibold mb-1 block">
                Shareable Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-military-900 border border-military-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 ${
                    copied
                      ? "bg-tactical-600 text-white"
                      : "bg-command-500 hover:bg-command-400 text-white"
                  }`}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Close button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-military-300 hover:text-gray-100 bg-military-700 hover:bg-military-600 border border-military-600/50 transition-all duration-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
