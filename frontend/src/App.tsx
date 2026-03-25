import { Navigate, Route, Routes } from "react-router-dom";

import { FlowCanvas } from "./components/FlowCanvas";
import { EventsLog } from "./components/EventsLog";
import { Inspector } from "./components/Inspector";
import { Palette } from "./components/Palette";
import { Toast } from "./components/Toast";
import { Toolbar } from "./components/Toolbar";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { useAuthStore } from "./stores/authStore";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function CanvasLayout() {
  return (
    <div className="relative flex h-full flex-col">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Toolbar />
        <div className="flex min-h-0 flex-1">
          <Palette />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              <FlowCanvas />
            </div>
            <EventsLog />
          </div>
          <Inspector />
        </div>
        <Toast />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <CanvasLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
