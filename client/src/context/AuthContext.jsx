import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('vaultverse_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('vaultverse_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          if (res.data && res.data.success) {
            setUser(res.data.user);
          }
        } catch (err) {
          console.error('Failed to restore session:', err.message);
          localStorage.removeItem('vaultverse_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.data && res.data.success) {
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem('vaultverse_token', newToken);
      setToken(newToken);
      setUser(newUser);
      return newUser;
    }
  };

  const register = async (name, email, password) => {
    const res = await authApi.register({ name, email, password });
    if (res.data && res.data.success) {
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem('vaultverse_token', newToken);
      setToken(newToken);
      setUser(newUser);
      return newUser;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('vaultverse_token');
      setToken(null);
      setUser(null);
    }
  };

  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

