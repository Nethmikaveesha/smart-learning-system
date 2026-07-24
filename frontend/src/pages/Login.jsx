import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const roleRoutes = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      login(res.data.user, res.data.token);
      navigate(roleRoutes[res.data.user.role] || "/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "The email or password you entered is incorrect."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-73px)] bg-slate-100">
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl lg:grid-cols-2">
        {/* Brand panel */}
        <div className="hidden bg-slate-950 px-10 py-14 text-white lg:flex lg:flex-col lg:justify-between">
          <Link to="/" className="text-2xl font-black tracking-tight">
            EduTrack
          </Link>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
              Smart Learning System
            </p>
            <h1 className="mt-4 max-w-lg text-5xl font-black leading-tight tracking-tight">
              Academic progress, clearly managed.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              Secure role-based dashboards for school administration, teaching,
              learning, and parent monitoring.
            </p>
          </div>

          <p className="text-sm text-slate-400">
            EduTrack School Management Platform
          </p>
        </div>

        {/* Login form panel */}
        <div className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Link
                to="/"
                className="text-2xl font-black tracking-tight text-blue-700"
              >
                EduTrack
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
              <div className="mb-8">
                <h2 className="text-3xl font-black tracking-tight text-slate-950">
                  Sign in
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Continue to your dashboard.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block text-sm font-bold text-slate-700">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Password
                  <div className="relative mt-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter password"
                      autoComplete="current-password"
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-16 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute inset-y-0 right-0 px-4 text-xs font-black text-slate-500 transition hover:text-slate-900"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              <Link
                to="/"
                className="font-bold text-blue-700 transition hover:text-blue-800"
              >
                Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Login;