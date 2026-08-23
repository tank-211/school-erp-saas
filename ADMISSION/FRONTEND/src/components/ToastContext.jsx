import { createContext, useContext, useEffect, useRef, useState } from "react";

const ToastContext = createContext(null);

const toastStyles = {
  info: {
    background: "#eff6ff",
    borderColor: "#93c5fd",
    color: "#1d4ed8",
  },
  success: {
    background: "#ecfdf5",
    borderColor: "#86efac",
    color: "#15803d",
  },
  error: {
    background: "#fef2f2",
    borderColor: "#fca5a5",
    color: "#b91c1c",
  },
};

function ToastViewport({ toast }) {
  if (!toast) {
    return null;
  }

  const styleSet = toastStyles[toast.type] ?? toastStyles.info;

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 4000,
        minWidth: 260,
        maxWidth: 360,
        padding: "12px 16px",
        borderRadius: 12,
        border: `1px solid ${styleSet.borderColor}`,
        background: styleSet.background,
        color: styleSet.color,
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      {toast.message}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = (message, type = "info", duration = 2500) => {
    if (!message) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setToast({ message, type });
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastViewport toast={toast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
