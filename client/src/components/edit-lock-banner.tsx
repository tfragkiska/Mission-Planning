import { useCallback } from "react";
import { requestEditLock, releaseEditLock } from "../lib/socket";
import type { LockState } from "../hooks/use-mission-socket";

interface Props {
  missionId: string;
  lockState: LockState;
  canEdit: boolean;
}

export default function EditLockBanner({ missionId, lockState, canEdit }: Props) {
  const handleRequestLock = useCallback(() => {
    requestEditLock(missionId);
  }, [missionId]);

  const handleReleaseLock = useCallback(() => {
    releaseEditLock(missionId);
  }, [missionId]);

  // User holds the lock — show release option
  if (lockState.isOwnLock) {
    return (
      <div className="glass-panel bg-command-600/10 border border-command-600/40 rounded-xl px-5 py-3 mb-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-command-400 animate-pulse" />
            <span className="text-sm font-medium text-command-300">
              You are currently editing this mission
            </span>
          </div>
          <button
            onClick={handleReleaseLock}
            className="px-3 py-1 text-xs font-medium text-military-300 hover:text-gray-100 bg-military-700/50 hover:bg-military-600/50 border border-military-600/50 rounded-lg transition-all duration-200"
          >
            Release Lock
          </button>
        </div>
      </div>
    );
  }

  // Someone else holds the lock — show locked banner
  if (lockState.locked && lockState.holder) {
    return (
      <div className="glass-panel bg-accent-600/10 border border-accent-600/40 rounded-xl px-5 py-3 mb-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-600/20 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-accent-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-medium text-accent-300">
                Editing locked by {lockState.holder.userName}
              </span>
              <p className="text-xs text-military-400 mt-0.5">
                You can view this mission but cannot make changes until the lock is released.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No lock and user can edit — show request button
  if (canEdit && !lockState.locked) {
    return (
      <div className="glass-panel bg-military-800/50 border border-military-700/50 rounded-xl px-5 py-3 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-military-400">
            Request editing access to make changes
          </span>
          <button
            onClick={handleRequestLock}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white bg-command-500 hover:bg-command-400 rounded-lg transition-all duration-200 shadow-lg shadow-glow-blue"
          >
            Start Editing
          </button>
        </div>
      </div>
    );
  }

  return null;
}
