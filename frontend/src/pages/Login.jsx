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
      setError("Please enter your email and password.");
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
        err.response?.data?.message || "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-73px)] bg-slate-100">
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-10 py-14 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-blue-400 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-400 blur-3xl" />
          </div>

          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
              Smart Learning System
            </p>
            <h1 className="mt-4 max-w-lg text-4xl font-bold tracking-tight">
              Welcome to EduTrack
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-300">
              Manage learning progress, attendance, exams, and parent visibility
              from one secure role-based platform.
            </p>
          </div>

          <div className="relative mt-10 space-y-4">
            {[
              "Role-based dashboards for every user",
              "Academic records and performance tracking",
              "AI-assisted grading and learning support",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-200">
                  ✓
                </span>
                <span className="text-sm text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                EduTrack
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">Sign in</h2>
              <p className="mt-2 text-slate-600">
                Access your dashboard with your account credentials.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
              <div className="mb-8 hidden lg:block">
                <h2 className="text-3xl font-bold text-slate-950">Sign in</h2>
                <p className="mt-2 text-slate-600">
                  Enter your credentials to continue to EduTrack.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block text-sm font-semibold text-slate-700">
                  Email address
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@school.com"
                    autoComplete="email"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Password
                  <div className="relative mt-2">
                    <input
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-800"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                            d="M3 3l18 18M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 5.09A10.94 10.94 0 0112 5c5.52 0 10.17 3.66 11 8.5a11.2 11.2 0 01-2.05 3.67M6.11 6.11A11.15 11.15 0 003 13.5C3.83 18.34 8.48 22 14 22c1.01 0 1.99-.13 2.91-.37"
                          />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                            d="M2.04 12C2.84 7.16 7.48 3.5 12 3.5S21.16 7.16 22 12c-.8 4.84-5.44 8.5-10 8.5S2.84 16.84 2.04 12Z"
                          />
                          <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              Need to explore the platform first?{" "}
              <Link to="/" className="font-semibold text-blue-700 hover:text-blue-800">
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
