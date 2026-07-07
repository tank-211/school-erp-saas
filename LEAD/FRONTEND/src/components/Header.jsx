import React, { useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import './Header.css';
import { useAuth } from '../components/ProtectedRoute'
import { useSettings } from "../context/SettingsContext";

export default function Header({ onAddLead }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [count, setCount] = useState(0);
  const [loadingNotif, setLoadingNotif] = useState(true);
  const { logout } = useAuth();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const settings = useSettings();
  console.log("HEADER USER:", user);
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("role");
    localStorage.removeItem("user") ;

    // optional: clear everything
    // localStorage.clear()

    window.location.href = "/login"
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

      const fetchNotifications = async () => {
      try {
          setLoadingNotif(true); // better place
        const res = await notificationAPI.getAll();
        const unreadRes = await notificationAPI.getUnreadCount();

        console.log("🔥 FULL NOTIFICATION RESPONSE:", res);
        console.log("🔥 FULL UNREAD RESPONSE:", unreadRes);

        // ✅ CLEAN & CORRECT
        setNotifications(res.data || []);
        setCount(unreadRes.data || 0);
        setLoadingNotif(false);
        
      } catch (err) {
        console.error("Notification error:", err);
        setLoadingNotif(false);
      }
    };
    useEffect(() => {
    console.log("✅ FINAL notifications:", notifications);
  }, [notifications]);

  return (
    <header className="header">
      {/* Search */}
      <div className="header-search">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input placeholder="Search leads, parents, students…" />
      </div>

      <div className="header-right">
        {/* Campus Selector */}
        <div className="campus-pill">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span>{settings?.campusname || 'Main Campus'}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {/* Add Lead Button */}
        <button className="btn-add-lead" onClick={onAddLead}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add New Lead
        </button>

        {/* Notifications */}
        <div className="notif-wrapper">
          <button className="icon-btn" onClick={() => {setNotifOpen(!notifOpen); if (!notifOpen){setLoadingNotif(true); fetchNotifications();}}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {count > 0 && <span className="notif-badge">{count}</span>}
          </button>
          {notifOpen && (
            <div className="notif-dropdown">
              <div className="notif-header">Notifications</div>
                    {loadingNotif ? (
                      <div className="notif-item">Loading...</div>
                    ) : notifications.length === 0 ? (
                      <div className="notif-item">No notifications</div>
                    ) : (
                          notifications.map((n) => (
                    <div key={n.id} className="notif-item">
                      <div className="notif-dot" />
                      <span>{n.message}</span>
                    </div>
                  ))
                )}
            </div>
          )}
        </div>

        {/* User */}
        <div className="header-user">
          <div className="user-avatar">{(user?.name||"U").split(" ").map(word=>word[0]).join("").toUpperCase()}</div>
          <div className="user-info">
            <span className="user-name">{user?.name||"User"}</span>
            <span className="user-role-tag">{user?.role||"Admin"}</span>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
    </header>
  );
}
