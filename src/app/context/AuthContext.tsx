import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface User {
  id: string;
  username: string;
  displayName: string;
  joinedAt: number;
  xp: number;
  level: number;
}

interface StoredUserRecord extends User {
  passwordHash: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (username: string, displayName: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  awardXP: (amount: number) => void;
}

const USERS_KEY = '01deck_users';
const SESSION_KEY = '01deck_session';

function hashPassword(username: string, password: string): string {
  return btoa(username.toLowerCase() + ':' + password);
}

function readUsers(): StoredUserRecord[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUserRecord[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.id ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(user: User | null): void {
  if (user === null) {
    localStorage.removeItem(SESSION_KEY);
  } else {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
}

function calcLevel(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readSession());

  const login = useCallback(async (
    username: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const users = readUsers();
    const found = users.find(u => u.username === username.toLowerCase());
    if (!found) {
      return { success: false, error: 'Invalid username or password' };
    }
    const hash = hashPassword(username.toLowerCase(), password);
    if (found.passwordHash !== hash) {
      return { success: false, error: 'Invalid username or password' };
    }
    const sessionUser: User = {
      id: found.id,
      username: found.username,
      displayName: found.displayName,
      joinedAt: found.joinedAt,
      xp: found.xp,
      level: found.level,
    };
    writeSession(sessionUser);
    setUser(sessionUser);
    return { success: true };
  }, []);

  const signup = useCallback(async (
    username: string,
    displayName: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanUsername = username.toLowerCase().trim();

    if (cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters' };
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      return { success: false, error: 'Username may only contain letters, numbers, and underscores' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const users = readUsers();
    if (users.some(u => u.username === cleanUsername)) {
      return { success: false, error: 'Username already taken' };
    }

    const newUser: StoredUserRecord = {
      id: Math.random().toString(36).slice(2, 10),
      username: cleanUsername,
      displayName: displayName.trim() || cleanUsername,
      joinedAt: Date.now(),
      xp: 0,
      level: 1,
      passwordHash: hashPassword(cleanUsername, password),
    };

    writeUsers([...users, newUser]);

    const sessionUser: User = {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.displayName,
      joinedAt: newUser.joinedAt,
      xp: newUser.xp,
      level: newUser.level,
    };
    writeSession(sessionUser);
    setUser(sessionUser);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    writeSession(null);
    setUser(null);
  }, []);

  const awardXP = useCallback((amount: number) => {
    setUser(prev => {
      if (!prev) return prev;
      const newXp = prev.xp + amount;
      const newLevel = calcLevel(newXp);
      const updated: User = { ...prev, xp: newXp, level: newLevel };

      // Persist to session
      writeSession(updated);

      // Persist to users store
      const users = readUsers();
      const idx = users.findIndex(u => u.username === updated.username);
      if (idx !== -1) {
        users[idx] = { ...users[idx], xp: newXp, level: newLevel };
        writeUsers(users);
      }

      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, login, signup, logout, awardXP }}>
      {children}
    </AuthContext.Provider>
  );
}
