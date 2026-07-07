import { createContext, useContext, useMemo, useState } from "react";
import axios from "axios";
import { clearToken, getToken, getUserData, parseToken, setToken, setUserData } from "../utils/authToken.js";

const AuthContext = createContext(null);

const getDecodedUserFromToken = (token) => {
  if (!token) {
    return null;
  }

  const payload = parseToken(token);
  if (!payload) {
    return null;
  }

  return {
    id: payload.id ?? null,
    school_id: payload.school_id ?? null,
    email: payload.email ?? null,
    role: payload.role ?? null,
  };
};

const readStoredAuth = () => {
  const token = getToken();
  const storedUser = getUserData();

  if (!token) {
    return { token: null, user: null, isAuthenticated: false };
  }

  const decodedUser = getDecodedUserFromToken(token);
  const user = storedUser
    ? {
        ...decodedUser,
        ...storedUser,
        role: storedUser.role ?? decodedUser?.role ?? null,
      }
    : decodedUser;

  if (user) {
    setUserData(user);
  }

  axios.defaults.headers.common.Authorization = `Bearer ${token}`;

  return {
    token,
    user,
    isAuthenticated: true,
  };
};

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => readStoredAuth());

  const login = (token, userData) => {
    const decodedUser = getDecodedUserFromToken(token);
    const user = {
      ...decodedUser,
      ...userData,
      role: userData?.role ?? decodedUser?.role ?? null,
    };

    setToken(token);
    setUserData(user);
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;

    setAuthState({
      token,
      user,
      isAuthenticated: true,
    });

    return user;
  };

  const logout = () => {
    clearToken();
    delete axios.defaults.headers.common.Authorization;
    setAuthState({ token: null, user: null, isAuthenticated: false });
  };

  const refreshAuth = () => {
    setAuthState(readStoredAuth());
  };

  const value = useMemo(() => ({
    ...authState,
    login,
    logout,
    refreshAuth,
    isAdmin: authState.user?.role === "admin" || authState.user?.role === "super_admin",
  }), [authState]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
