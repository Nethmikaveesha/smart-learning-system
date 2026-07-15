import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import DashboardLayout from "./components/DashboardLayout";
import PublicLayout from "./components/PublicLayout";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherTopicErrorAnalysis from "./pages/TeacherTopicErrorAnalysis";
import StudentDashboard from "./pages/StudentDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import ParentRiskAlerts from "./pages/ParentRiskAlerts";

import EssayGrader from "./pages/EssayGrader";
import Chatbot from "./pages/Chatbot";
import RiskDashboard from "./pages/RiskDashboard";
import PublicPage from "./pages/public/PublicPage";
import DashboardFeaturePage from "./pages/DashboardFeaturePage";

// This component protects dashboard routes.
// If the user is not logged in, it redirects to the login page.
// If the logged-in user's role is not allowed, it also redirects to login.
function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public website routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<PublicPage page="home" />} />
        <Route path="/about" element={<PublicPage page="about" />} />
        <Route path="/features" element={<PublicPage page="features" />} />
        <Route path="/contact" element={<PublicPage page="contact" />} />
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Admin dashboard routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="*" element={<DashboardFeaturePage />} />
      </Route>

      {/* Teacher dashboard routes */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={["teacher", "admin"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route
          path="topic-error-analysis"
          element={<TeacherTopicErrorAnalysis />}
        />
        <Route path="*" element={<DashboardFeaturePage />} />
      </Route>

      {/* Student dashboard routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="essay-grader" element={<EssayGrader />} />
        <Route path="*" element={<DashboardFeaturePage />} />
      </Route>

      {/* Old direct essay-grader URL redirects to the student dashboard essay page */}
      <Route
        path="/essay-grader"
        element={<Navigate to="/student/essay-grader" replace />}
      />

      {/* Parent dashboard routes */}
      <Route
        path="/parent"
        element={
          <ProtectedRoute allowedRoles={["parent"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ParentDashboard />} />

        {/* Sidebar Risk Alerts page with ML prediction buttons */}
        <Route path="risk-alerts" element={<ParentRiskAlerts />} />

        {/* Other parent sidebar pages use the reusable feature page */}
        <Route path="*" element={<DashboardFeaturePage />} />
      </Route>

      {/* Shared chatbot route */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["student", "teacher", "admin"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/chatbot" element={<Chatbot />} />
      </Route>

      {/* Standalone ML research/demo dashboard */}
      <Route path="/risk-dashboard" element={<RiskDashboard />} />

      {/* Unknown routes redirect to public home */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;