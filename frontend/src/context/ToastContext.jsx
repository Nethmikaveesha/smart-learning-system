import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { registerToastHandler } from "../utils/toastBridge";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (type, message, duration = 4200) => {
      const text = String(message || "").trim();
      if (!text) return null;

      const id = ++toastId;
      setToasts((current) => [...current.slice(-4), { id, type, message: text }]);

      window.setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (message, duration) => push("success", message, duration),
      error: (message, duration) => push("error", message, duration),
      info: (message, duration) => push("info", message, duration),
      dismiss,
    }),
    [dismiss, push]
  );

  useEffect(() => {
    registerToastHandler(toast);
    return () => registerToastHandler(null);
  }, [toast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const styles =
    toast.type === "success"
      ? "border-emerald-200 bg-white text-emerald-900"
      : toast.type === "error"
        ? "border-red-200 bg-white text-red-900"
        : "border-slate-200 bg-white text-slate-900";

  const Icon =
    toast.type === "success"
      ? CheckCircle2
      : toast.type === "error"
        ? XCircle
        : Info;

  const iconClass =
    toast.type === "success"
      ? "text-emerald-600"
      : toast.type === "error"
        ? "text-red-600"
        : "text-sky-600";

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-slate-900/10 ${styles}`}
      role="status"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} aria-hidden />
      <p className="flex-1 text-sm font-medium leading-5">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
