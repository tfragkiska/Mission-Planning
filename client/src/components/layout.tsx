import { useAuthStore } from "../stores/auth-store";
import { useNavigate } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-military-900">
      <nav className="bg-military-800 border-b border-military-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1
            className="text-lg font-bold cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            Mission Planning
          </h1>
          {user && (
            <span className="text-sm text-military-400">
              {user.name} ({user.role})
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-military-400 hover:text-gray-100 transition-colors"
        >
          Sign Out
        </button>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
