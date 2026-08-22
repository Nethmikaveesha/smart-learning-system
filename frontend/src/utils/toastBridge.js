/**
 * Tiny bridge so axios can emit toasts without importing React context.
 * ToastProvider registers the live handler on mount.
 */

let handler = null;

export function registerToastHandler(nextHandler) {
  handler = nextHandler;
}

export function toastSuccess(message) {
  handler?.success?.(message);
}

export function toastError(message) {
  handler?.error?.(message);
}

export function toastInfo(message) {
  handler?.info?.(message);
}
