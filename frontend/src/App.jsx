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
import EssayGrader from "./pages/EssayGrader";
import Chatbot from "./pages/Chatbot";
import RiskDashboard from "./pages/RiskDashboard";
import PublicPage from "./pages/public/PublicPage";
import DashboardFeaturePage from "./pages/DashboardFeaturePage";

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
      <Route element={<PublicLayout />}>
        <Route path="/" element={<PublicPage page="home" />} />
        <Route path="/about" element={<PublicPage page="about" />} />
        <Route path="/features" element={<PublicPage page="features" />} />
        <Route path="/contact" element={<PublicPage page="contact" />} />
        <Route path="/login" element={<Login />} />
      </Route>

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

      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={["teacher", "admin"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="topic-error-analysis" element={<TeacherTopicErrorAnalysis />} />
        <Route path="*" element={<DashboardFeaturePage />} />
      </Route>

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

      <Route path="/essay-grader" element={<Navigate to="/student/essay-grader" replace />} />

      <Route
        path="/parent"
        element={
          <ProtectedRoute allowedRoles={["parent"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ParentDashboard />} />
        <Route path="*" element={<DashboardFeaturePage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={["student", "teacher", "admin"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/chatbot" element={<Chatbot />} />
      </Route>

      <Route path="/risk-dashboard" element={<RiskDashboard />} />
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
