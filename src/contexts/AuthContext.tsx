import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, User } from '@/db/db';
import { AlertTriangle, Cloud, X, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { supabase, isConfigured as isSupabaseConfigured } from '@/lib/supabase';
import { syncManager } from '@/lib/syncManager';
import { hashLocalPassword, isHashedPassword, verifyLocalPassword } from '@/lib/localPassword';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, passwordHash: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, passwordHash: string) => Promise<{ success: boolean; requireEmailConfirmation: boolean }>;
  logout: (force?: boolean) => void;
  authProvider: 'supabase' | 'local' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authProvider, setAuthProvider] = useState<'supabase' | 'local' | null>(null);
  const [logoutWarning, setLogoutWarning] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          // Initialize via Supabase
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Fetch subscription status from public.users table
            const { data: userData } = await supabase
              .from('users')
              .select('subscription_status, dodo_customer_id, subscription_end_date')
              .eq('id', session.user.id)
              .single();

            setUser({
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
              email: session.user.email || '',
              passwordHash: '', // Not needed for supabase user session
              createdAt: new Date(session.user.created_at).getTime(),
              subscriptionStatus: userData?.subscription_status || null,
              subscriptionEndDate: userData?.subscription_end_date ? new Date(userData.subscription_end_date).getTime() : null,
              stripeCustomerId: userData?.dodo_customer_id || null // reusing field for Dodo id locally
            });
            setAuthProvider('supabase');
            syncManager.pullFromSupabase(session.user.id);
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
              if (session?.user && supabase) {
                const { data: userData } = await supabase
                  .from('users')
                  .select('subscription_status, dodo_customer_id, subscription_end_date')
                  .eq('id', session.user.id)
                  .single();

                setUser({
                  id: session.user.id,
                  name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
                  email: session.user.email || '',
                  passwordHash: '',
                  createdAt: new Date(session.user.created_at).getTime(),
                  subscriptionStatus: userData?.subscription_status || null,
                  subscriptionEndDate: userData?.subscription_end_date ? new Date(userData.subscription_end_date).getTime() : null,
                  stripeCustomerId: userData?.dodo_customer_id || null
                });
                setAuthProvider('supabase');
                if (_event === 'SIGNED_IN') {
                  syncManager.pullFromSupabase(session.user.id);
                }
              } else if (_event === 'SIGNED_OUT') {
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
        if (foundUser && await verifyLocalPassword(passwordHash, foundUser.passwordHash)) {
          if (!isHashedPassword(foundUser.passwordHash)) {
            // Migra registros antigos que guardavam a senha em texto.
            foundUser.passwordHash = await hashLocalPassword(passwordHash);
            await db.users.put(foundUser);
          }
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
          options: {
            redirectTo: `${window.location.origin}/planos`,
          }
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
          passwordHash: await hashLocalPassword(passwordHash),
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

  const logout = async (force = false) => {
    try {
      if (!force) {
        setLogoutWarning(true);
        return; // Abort logout without running cleanup, show modal instead
      }

      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }

      // Cleanup on successful logout
      await Promise.all([
        db.patients.clear(),
        db.audiometries.clear(),
        db.anamneses.clear(),
        db.appointments.clear(),
        db.settings.clear()
      ]);
      setUser(null);
      setAuthProvider(null);
      localStorage.removeItem('audiodash_user_id');
      setLogoutWarning(false);
      setIsLoggingOut(false);
    } catch (error) {
      console.error('Logout error', error);
      setIsLoggingOut(false);
    }
  };

  const handleSaveAndLogout = async () => {
    setIsLoggingOut(true);
    await syncManager.sync();
    await logout(true);
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
      
      {/* Modal de Aviso de Logout */}
      {logoutWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-5">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <button 
                onClick={() => !isLoggingOut && setLogoutWarning(false)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isLoggingOut}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">Deseja sair do sistema?</h3>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              Você está prestes a sair. Se você tiver dados offline não sincronizados, <strong>eles serão perdidos</strong> se não forem salvos. Recomendamos sincronizar antes de sair.
            </p>

            <div className="flex gap-3 w-full mb-4">
              <button 
                onClick={() => setLogoutWarning(false)}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveAndLogout}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                ) : (
                  <><Cloud className="w-4 h-4" /> Salvar & Sair</>
                )}
              </button>
            </div>
            
            <div className="text-center">
               <button 
                 onClick={() => logout(true)} 
                 disabled={isLoggingOut}
                 className="text-xs text-red-500 hover:text-red-600 hover:underline font-medium p-1 disabled:opacity-50"
               >
                 Apenas sair (ignorar pendências)
               </button>
            </div>
          </div>
        </div>
      )}
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
