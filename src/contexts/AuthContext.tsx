import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../config/api';
import { User, LoginRequest, LoginResponse } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('accessToken');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          // Tenta carregar o usuário do localStorage
          const user = JSON.parse(savedUser);
          setUser(user);
        } catch (error) {
          console.error('Erro ao carregar usuário:', error);
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    
    loadUser();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      const { accessToken, refreshToken, user } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user || !!localStorage.getItem('accessToken'),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

