import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Key,
  X,
  Check,
  Shield,
  Trash2,
  CheckCircle,
} from "lucide-react";
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUserPassword,
  deleteAdminUser,
} from "../services/adminService.js";
import "../style.css";

export function AdminPortal() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(null); // stores user id

  // Form state
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff(counselor)",
  });
  const [resetPassword, setResetPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [successToast, setSuccessToast] = useState("");

  const showToast = (message) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(""), 3000);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminUsers();
      setUsers(data);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await createAdminUser(newUser);
      setShowCreateModal(false);
      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "staff(counselor)",
      });
      loadUsers();
      showToast("User Created successfully!");
    } catch (err) {
      alert(err.message || "Failed to create user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await updateAdminUserPassword(showResetModal, resetPassword);
      setShowResetModal(null);
      setResetPassword("");
      showToast("Password Successfully Changed!");
    } catch (err) {
      alert(err.message || "Failed to reset password");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteAdminUser(userId);
      loadUsers();
      showToast("User Deleted successfully!");
    } catch (err) {
      alert(err.message || "Failed to delete user");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="page">
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 className="page-title">Admin Portal</h1>
          <p className="page-sub">Manage users and access control</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={18} />
          <span>Create User</span>
        </button>
      </div>

      <div className="card">
        <div
          className="card-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div className="card-title">System Users</div>
          <div className="search-bar" style={{ width: "300px" }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {successToast && (
            <div
              style={{
                margin: "20px",
                background: "#dcfce7",
                border: "1px solid #86efac",
                borderRadius: "var(--r)",
                padding: "12px 16px",
                display: "flex",
                gap: 12,
              }}
            >
              <CheckCircle
                size={20}
                style={{ color: "#16a34a", flexShrink: 0 }}
              />
              <div style={{ color: "#15803d", fontSize: 14 }}>
                {successToast}
              </div>
            </div>
          )}
          {error && (
            <div style={{ padding: "20px", color: "red" }}>{error}</div>
          )}

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{ textAlign: "center", padding: "20px" }}
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{ textAlign: "center", padding: "20px" }}
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 500 }}>{user.name}</td>
                      <td style={{ color: "var(--gray-500)" }}>{user.email}</td>
                      <td>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: 500,
                            background:
                              user.role === "admin" ||
                              user.role === "super_admin"
                                ? "var(--primary-light)"
                                : "#f3f4f6",
                            color:
                              user.role === "admin" ||
                              user.role === "super_admin"
                                ? "var(--primary-dark)"
                                : "#4b5563",
                          }}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge status-${user.status === "active" ? "won" : "lost"}`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setShowResetModal(user.id)}
                            title="Reset Password"
                          >
                            <Key size={14} />
                            <span>Reset</span>
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Delete User"
                            style={{ borderColor: "#fee2e2", color: "#dc2626" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          style={{
            display: "flex",
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="modal-content"
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "8px",
              width: "100%",
              maxWidth: "400px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Shield size={20} color="var(--primary)" />
                Create New User
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={20} color="var(--gray-500)" />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="form-group mb-3">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Role</label>
                <select
                  className="form-input"
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                >
                  <option value="staff(counselor)">Staff (Counselor)</option>
                  <option value="staff(accountant)">Staff (Accountant)</option>
                </select>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div
          className="modal-overlay"
          style={{
            display: "flex",
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="modal-content"
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "8px",
              width: "100%",
              maxWidth: "400px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Key size={20} color="var(--primary)" />
                Reset Password
              </h2>
              <button
                onClick={() => setShowResetModal(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={20} color="var(--gray-500)" />
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="form-group mb-4">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter secure password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowResetModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
