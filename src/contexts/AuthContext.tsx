import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, User } from '@/db/db';
import { v4 as uuidv4 } from 'uuid';
import { supabase, isConfigured as isSupabaseConfigured } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, passwordHash: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, passwordHash: string) => Promise<{ success: boolean; requireEmailConfirmation: boolean }>;
  logout: () => void;
  authProvider: 'supabase' | 'local' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authProvider, setAuthProvider] = useState<'supabase' | 'local' | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          // Initialize via Supabase
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            setUser({
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
              email: session.user.email || '',
              passwordHash: '', // Not needed for supabase user session
              createdAt: new Date(session.user.created_at).getTime()
            });
            setAuthProvider('supabase');
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
              if (session?.user) {
                setUser({
                  id: session.user.id,
                  name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
                  email: session.user.email || '',
                  passwordHash: '',
                  createdAt: new Date(session.user.created_at).getTime()
                });
                setAuthProvider('supabase');
              } else {
                setUser(null);
              }
              setIsLoading(false);
            }
          );
          
          setIsLoading(false);
          return () => {
            subscription.unsubscribe();
          };
        } else {
          // Initialize via Local Dexie
          const storedUserId = localStorage.getItem('audiodash_user_id');
          if (storedUserId) {
            const storedUser = await db.users.get(storedUserId);
            if (storedUser) {
              setUser(storedUser);
              setAuthProvider('local');
            } else {
              localStorage.removeItem('audiodash_user_id');
            }
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth', error);
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, passwordHash: string): Promise<boolean> => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: passwordHash, // Assuming plain password was passed as hash for simplicity in UI, or we should change the UI to name it 'password'
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        return !!data.user;
      } else {
        // Local login
        const foundUser = await db.users.where('email').equalsIgnoreCase(email).first();
        if (foundUser && foundUser.passwordHash === passwordHash) {
          setUser(foundUser);
          setAuthProvider('local');
          localStorage.setItem('audiodash_user_id', foundUser.id);
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('Login error', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
        });
        if (error) {
          throw new Error(error.message);
        }
      } else {
        throw new Error('Supabase não está configurado. O login social requer o Supabase.');
      }
    } catch (error) {
      console.error('Google login error', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, passwordHash: string): Promise<{ success: boolean; requireEmailConfirmation: boolean }> => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: passwordHash,
          options: {
            data: {
              name,
            }
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        // Se data.session for null, significa que a confirmação de e-mail está ativada no Supabase
        const requireEmailConfirmation = data.user !== null && data.session === null;

        return { success: !!data.user, requireEmailConfirmation };
      } else {
        // Local register
        const existingUser = await db.users.where('email').equalsIgnoreCase(email).first();
        if (existingUser) {
          throw new Error('E-mail já está em uso localmente.');
        }

        const newUser: User = {
          id: uuidv4(),
          name,
          email,
          passwordHash,
          createdAt: Date.now()
        };

        await db.users.add(newUser);
        
        setUser(newUser);
        setAuthProvider('local');
        localStorage.setItem('audiodash_user_id', newUser.id);
        
        return { success: true, requireEmailConfirmation: false };
      }
    } catch (error) {
      console.error('Register error', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      setUser(null);
      setAuthProvider(null);
      localStorage.removeItem('audiodash_user_id');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      loginWithGoogle,
      register,
      logout,
      authProvider
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
