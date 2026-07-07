import React, { useState, useEffect } from "react";
import axios from "axios";

const HealthCheck = () => {
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await axios.get("/api/health", { timeout: 5000 });

      if (response.data?.success) {
        setStatus("connected");
      } else {
        setStatus("error");
        setError("Invalid response from server");
      }
    } catch (err) {
      setStatus("error");
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to connect to backend",
      );
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const getStatusDisplay = () => {
    switch (status) {
      case "connected":
        return (
          <div style={styles.badge}>
            <span style={styles.green}>🟢</span>
            <span style={styles.text}>Backend Connected</span>
          </div>
        );
      case "error":
        return (
          <div style={styles.badge}>
            <span style={styles.red}>🔴</span>
            <span style={styles.text}>Backend Not Connected</span>
          </div>
        );
      case "loading":
      default:
        return (
          <div style={styles.badge}>
            <span style={styles.loading}>⏳</span>
            <span style={styles.text}>Checking Connection...</span>
          </div>
        );
    }
  };

  return (
    <div style={styles.container}>
      {getStatusDisplay()}

      {status === "error" && error && (
        <div style={styles.errorMessage}>{error}</div>
      )}

      {status !== "loading" && (
        <button onClick={checkHealth} style={styles.retryButton}>
          Retry
        </button>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    backgroundColor: "#f8f9fa",
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    maxWidth: "300px",
  },
  badge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "500",
  },
  green: {
    fontSize: "16px",
  },
  red: {
    fontSize: "16px",
  },
  loading: {
    fontSize: "16px",
    animation: "spin 1s linear infinite",
  },
  text: {
    color: "#333",
  },
  errorMessage: {
    fontSize: "12px",
    color: "#d32f2f",
    textAlign: "center",
    maxWidth: "280px",
    wordBreak: "break-word",
  },
  retryButton: {
    padding: "6px 12px",
    fontSize: "12px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
};

// Add keyframe animation
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default HealthCheck;
