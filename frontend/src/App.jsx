import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import RegisterStudent from "./pages/RegisterStudent";
import RegisterInstitution from "./pages/RegisterInstitution";
import VerifyPortal from "./pages/VerifyPortal";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import BlockchainExplorer from "./pages/dashboards/BlockchainExplorer";
import UserManagement from "./pages/dashboards/UserManagement";
import InstitutionDashboard from "./pages/dashboards/InstitutionDashboard";
import InstitutionProfile from "./pages/dashboards/InstitutionProfile";
import BulkUpload from "./pages/dashboards/BulkUpload";
import IssueHistory from "./pages/dashboards/IssueHistory";
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import SharedVerify from "./pages/SharedVerify";
import PassCheck from "./pages/PassCheck";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register/student" element={<RegisterStudent />} />
      <Route path="/register/institution" element={<RegisterInstitution />} />
      <Route path="/verify" element={<VerifyPortal />} />
      <Route path="/verify/share/:token" element={<SharedVerify />} />
      <Route path="/verify/pass" element={<PassCheck />} />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/transactions"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <BlockchainExplorer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institution/dashboard"
        element={
          <ProtectedRoute allowedRoles={["institution"]}>
            <InstitutionDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institution/profile"
        element={
          <ProtectedRoute allowedRoles={["institution"]}>
            <InstitutionProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institution/bulk-upload"
        element={
          <ProtectedRoute allowedRoles={["institution"]}>
            <BulkUpload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institution/history"
        element={
          <ProtectedRoute allowedRoles={["institution"]}>
            <IssueHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-olive-950 text-paper">
      <h1 className="font-display text-4xl font-semibold">404</h1>
      <p className="mt-2 text-paper/60">This page doesn't exist.</p>
      <a href="/" className="mt-6 rounded-full bg-clay-500 px-6 py-2.5 font-semibold text-olive-950">
        Back home
      </a>
    </div>
  );
}
