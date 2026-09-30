"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User, UserRole } from "./types";
import { api } from "./api/client";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<User>;
  register: (data: {
    name?: string;
    email: string;
    password?: string;
    phone?: string;
    role?: UserRole;
    departmentCode?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const { user: fetchedUser } = await api.auth.me();
      setUser(fetchedUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password?: string) => {
    setLoading(true);
    try {
      const { user: loggedInUser } = await api.auth.login({ email, password });
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: {
    name?: string;
    email: string;
    password?: string;
    phone?: string;
    role?: UserRole;
    departmentCode?: string;
  }) => {
    setLoading(true);
    try {
      const { user: registeredUser } = await api.auth.register(data);
      setUser(registeredUser);
      return registeredUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.auth.logout();
      setUser(null);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const switchDemoRole = async (role: UserRole) => {
    let email = "citizen@civiceye.internal";
    if (role === "ADMIN") email = "admin@civiceye.internal";
    if (role === "OPERATOR") email = "operator@civiceye.internal";
    if (role === "DEPT_OFFICER") email = "roads.officer@civiceye.internal";

    const loggedUser = await login(email, "demoPassword123");
    if (role === "CITIZEN") {
      router.push("/citizen/dashboard");
    } else {
      router.push("/authority/dashboard");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
