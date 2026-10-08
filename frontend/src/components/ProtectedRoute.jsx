import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps a route element, redirecting to the appropriate login page if the
 * user isn't authenticated, or to their own dashboard if they're logged in
 * but hold the wrong role for this route.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="h-10 w-10 rounded-full border-2 border-olive-900/20 border-t-olive-900 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return children;
}

export function roleHome(role) {
  switch (role) {
    case "super_admin":
      return "/admin/dashboard";
    case "institution":
      return "/institution/dashboard";
    case "student":
      return "/student/dashboard";
    default:
      return "/";
  }
}
