import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/auth-store";

const LoginPage = React.lazy(() => import("./pages/login-page"));
const DashboardPage = React.lazy(() => import("./pages/dashboard-page"));
const MissionPage = React.lazy(() => import("./pages/mission-page"));
const AuditPage = React.lazy(() => import("./pages/audit-page"));
const BriefingPreviewPage = React.lazy(() => import("./pages/briefing-preview-page"));
const SharedMissionPage = React.lazy(() => import("./pages/shared-mission-page"));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-military-900 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 border-2 border-military-700 rounded-full" />
          <div className="absolute inset-0 border-2 border-t-tactical-500 rounded-full animate-spin" />
          <div className="absolute inset-2 border-2 border-t-command-500 border-transparent rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
        </div>
        <p className="text-military-400 font-mono text-xs uppercase tracking-[0.3em]">
          Loading Module
        </p>
        <div className="mt-3 flex items-center justify-center gap-1">
          <div className="w-1 h-1 rounded-full bg-tactical-500 animate-pulse" />
          <div className="w-1 h-1 rounded-full bg-tactical-500 animate-pulse" style={{ animationDelay: "0.2s" }} />
          <div className="w-1 h-1 rounded-full bg-tactical-500 animate-pulse" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/shared/:token" element={<SharedMissionPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/missions/:id"
          element={
            <ProtectedRoute>
              <MissionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/missions/:id/briefing"
          element={
            <ProtectedRoute>
              <BriefingPreviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute>
              <AuditPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
