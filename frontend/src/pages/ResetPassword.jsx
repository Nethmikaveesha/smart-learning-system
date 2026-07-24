import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import AuthShell from "../components/AuthShell";

const inputClass =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => searchParams.get("token")?.trim() || "",
    [searchParams]
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setError("This reset link is missing a token. Request a new link.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Enter and confirm your new password.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await api.post("/auth/reset-password", {
        token,
        newPassword,
        confirmPassword,
      });

      setSuccess(res.data.message);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not reset password. Request a new link and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a new password for your EduTrack account."
      panelTitle="Create a new password"
      panelText="After you save a new password, the reset link stops working and you can sign in normally."
      footer={
        <p className="text-sm text-slate-500">
          <Link
            to="/login"
            className="font-semibold text-sky-700 transition hover:text-sky-800"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      {!token ? (
        <div className="space-y-4">
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            This page needs a valid reset token from your email or reset link.
          </div>
          <Link
            to="/forgot-password"
            className="inline-flex text-sm font-semibold text-sky-700 hover:text-sky-800"
          >
            Request a new reset link
          </Link>
        </div>
      ) : (
        <>
          {error ? (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            >
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {success} Redirecting to sign in…
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <label className="block text-sm font-semibold text-slate-700">
              New password
              <div className="relative mt-2">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  autoFocus
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
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Confirm new password
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                className={inputClass}
              />
            </label>

            <button
              type="submit"
              disabled={loading || Boolean(success)}
              className="w-full rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-sky-300"
            >
              {loading ? "Saving..." : "Update password"}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export default ResetPassword;
