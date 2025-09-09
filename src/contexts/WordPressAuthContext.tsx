import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as wpLogin, validateToken } from '@/lib/wordpress';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const WordPressAuthContext = createContext<AuthContextType | undefined>(undefined);

export function WordPressAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing token on initial load
    const token = localStorage.getItem('wpToken');
    const userData = localStorage.getItem('wpUser');

    const validateAuth = async () => {
      if (!token || !userData) {
        setIsLoading(false);
        return;
      }

      try {
        await validateToken(token);
        setIsAuthenticated(true);
        setUser(JSON.parse(userData));
      } catch (err) {
        // Token is invalid or expired
        localStorage.removeItem('wpToken');
        localStorage.removeItem('wpUser');
      } finally {
        setIsLoading(false);
      }
    };

    validateAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await wpLogin(username, password);
      
      // Store the token and user data
      localStorage.setItem('wpToken', data.token);
      localStorage.setItem('wpUser', JSON.stringify(data.user));
      
      setIsAuthenticated(true);
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('wpToken');
    localStorage.removeItem('wpUser');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <WordPressAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        error,
      }}
    >
      {!isLoading && children}
    </WordPressAuthContext.Provider>
  );
}

export function useWordPressAuth() {
  const context = useContext(WordPressAuthContext);
  if (context === undefined) {
    throw new Error('useWordPressAuth must be used within a WordPressAuthProvider');
  }
  return context;
}
