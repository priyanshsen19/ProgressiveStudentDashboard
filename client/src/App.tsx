import { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { LoadingState } from "./components/common/states";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Courses } from "./pages/Courses";
import { CourseDetail } from "./pages/CourseDetail";
import { Lesson } from "./pages/Lesson";
import { MentorInfo } from "./pages/MentorInfo";

// Guards routes that require authentication. `role` optionally restricts to one role.
function Protected({
  children,
  role,
}: {
  children: ReactNode;
  role?: "STUDENT" | "MENTOR";
}) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    // Send users to the home appropriate for their role.
    return <Navigate to={user.role === "MENTOR" ? "/mentor-info" : "/dashboard"} replace />;
  }
  return <>{children}</>;
}

// Redirects already-authenticated users away from auth pages.
function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (user) return <Navigate to={user.role === "MENTOR" ? "/mentor-info" : "/dashboard"} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

      <Route path="/dashboard" element={<Protected role="STUDENT"><Dashboard /></Protected>} />
      <Route path="/courses" element={<Protected role="STUDENT"><Courses /></Protected>} />
      <Route path="/courses/:courseId" element={<Protected role="STUDENT"><CourseDetail /></Protected>} />
      <Route
        path="/courses/:courseId/lessons/:lessonId"
        element={<Protected role="STUDENT"><Lesson /></Protected>}
      />

      <Route path="/mentor-info" element={<Protected role="MENTOR"><MentorInfo /></Protected>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
