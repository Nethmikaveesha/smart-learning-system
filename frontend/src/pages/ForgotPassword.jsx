import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import AuthShell from "../components/AuthShell";

const inputClass =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const res = await api.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      setResult(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not start password reset. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we’ll send you a link to reset your password."
      panelTitle="Recover your account"
      panelText="We’ll email you a secure one-time link that expires in one hour so you can set a new password and sign in again."
      footer={
        <p className="text-sm text-slate-500">
          Remembered it?{" "}
          <Link
            to="/login"
            className="font-semibold text-sky-700 transition hover:text-sky-800"
          >
            Back to sign in
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

      {result ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {result.message}
          </div>

          {result.emailSent ? (
            <p className="text-sm leading-6 text-slate-600">
              Check your inbox (and spam folder) for the reset link. It expires
              in 1 hour.
            </p>
          ) : null}

          {result.resetLink ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm font-semibold text-amber-900">
                {result.demoNote ||
                  "Use this secure link to reset your password:"}
              </p>
              <Link
                to={`/reset-password?token=${encodeURIComponent(
                  result.resetToken || ""
                )}`}
                className="mt-3 inline-flex rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800"
              >
                Continue to reset password
              </Link>
              <p className="mt-3 break-all text-xs leading-5 text-amber-800/80">
                Or open: {result.resetLink}
              </p>
              <p className="mt-2 text-xs leading-5 text-amber-800/80">
                This link is shown because outbound email is not configured.
                Configure SMTP on the server for production email delivery.
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setResult(null);
              setEmail("");
            }}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Use a different email
          </button>
        </div>
      ) : (
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-sky-300"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default ForgotPassword;
