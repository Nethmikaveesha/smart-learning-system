import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";

const roleRoutes = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

const REMEMBER_KEY = "edutrack_remember_email";

const inputClass =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRememberEmail(true);
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const normalizedEmail = email.trim().toLowerCase();
      const res = await api.post("/auth/login", {
        email: normalizedEmail,
        password,
      });

      if (rememberEmail) {
        localStorage.setItem(REMEMBER_KEY, normalizedEmail);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

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
    <AuthShell
      title="Sign in to EduTrack"
      subtitle="Enter your email and password to continue."
      footer={
        <p className="text-sm text-slate-500">
          <Link
            to="/"
            className="font-semibold text-sky-700 transition hover:text-sky-800"
          >
            Back to home
          </Link>
        </p>
      }
    >
      {error ? (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            className={inputClass}
          />
        </label>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="login-password"
              className="text-sm font-semibold text-slate-700"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-sky-700 transition hover:text-sky-800"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative mt-2">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className={`${inputClass} mt-0 pr-16`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(event) => setRememberEmail(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          Remember my email on this device
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-sky-300"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-500">
        Having trouble signing in?{" "}
        <Link
          to="/forgot-password"
          className="font-semibold text-sky-700 hover:text-sky-800"
        >
          Reset your password
        </Link>
      </p>
    </AuthShell>
  );
}

export default Login;
