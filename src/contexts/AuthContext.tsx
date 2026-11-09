import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { db, User } from '@/db/db';
import { AlertTriangle, Cloud, X, Loader2, Download } from 'lucide-react';
import { supabase, isConfigured as isSupabaseConfigured } from '@/lib/supabase';
import { syncManager, getDataOwner, setDataOwner, isForeignData } from '@/lib/syncManager';
import { hashLocalPassword, isHashedPassword, verifyLocalPassword } from '@/lib/localPassword';
import { pickProfile, type SubscriptionProfile } from '@/lib/settingsStatus';
import { downloadFullBackup } from '@/lib/backup';
import { forgetCalendarConnections } from '@/lib/calendarSyncService';
import { customConfirm } from '@/lib/dialogs';

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

const PROFILE_CACHE_PREFIX = 'audiodash_profile_';
const PROFILE_COLUMNS = 'subscription_status, dodo_customer_id, subscription_end_date, is_admin';

function readCachedProfile(userId: string): SubscriptionProfile | null {
  try { return JSON.parse(localStorage.getItem(PROFILE_CACHE_PREFIX + userId) || 'null'); } catch { return null; }
}

function writeCachedProfile(userId: string, profile: SubscriptionProfile) {
  try { localStorage.setItem(PROFILE_CACHE_PREFIX + userId, JSON.stringify(profile)); } catch { /* sem armazenamento: só não guarda */ }
}

async function loadProfile(session: Session): Promise<User> {
  const { data, error } = await supabase!.from('users').select(PROFILE_COLUMNS).eq('id', session.user.id).single();
  const profile = pickProfile((data as SubscriptionProfile | null) ?? null, !!error, readCachedProfile(session.user.id));
  if (!error && data) writeCachedProfile(session.user.id, data as SubscriptionProfile);
  return {
    id: session.user.id,
    name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
    email: session.user.email || '',
    passwordHash: '', // Not needed for supabase user session
    createdAt: new Date(session.user.created_at).getTime(),
    subscriptionStatus: (profile?.subscription_status as User['subscriptionStatus']) || null,
    subscriptionEndDate: profile?.subscription_end_date ? new Date(profile.subscription_end_date).getTime() : null,
    isAdmin: profile?.is_admin === true,
    stripeCustomerId: profile?.dodo_customer_id || null // reusing field for Dodo id locally
  };
}

async function clearLocalData() {
  await Promise.all([
    db.patients.clear(),
    db.audiometries.clear(),
    db.anamneses.clear(),
    db.appointments.clear(),
    db.settings.clear()
  ]);
  syncManager.clearPendingDeletions();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authProvider, setAuthProvider] = useState<'supabase' | 'local' | null>(null);
  const [logoutWarning, setLogoutWarning] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  /** Registros ainda não enviados; mostrados no aviso de saída. */
  const [pendingCount, setPendingCount] = useState(0);
  /** Pendências de OUTRA conta encontradas neste aparelho ao entrar (bloqueia a tela até decidir). */
  const [foreignPending, setForeignPending] = useState(0);

  /** Após o login: confere de quem são os dados locais antes de puxar/enviar qualquer coisa. */
  const reconcileOwner = async (userId: string) => {
    if (isForeignData(getDataOwner(), userId)) {
      const pending = await syncManager.countPending();
      if (pending > 0) {
        setForeignPending(pending);
        return;
      }
      await clearLocalData(); // dados sincronizados de outra conta: já estão na nuvem dela
      setDataOwner(userId);
    }
    syncManager.pullFromSupabase(userId);
  };

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // Um único ouvinte trata a sessão inicial e as mudanças. O trabalho roda fora do callback (setTimeout):
      // chamar o Supabase com await dentro de onAuthStateChange pode travar o cliente (documentação do supabase-js).
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setTimeout(async () => {
          try {
            if (session?.user) {
              setUser(await loadProfile(session));
              setAuthProvider('supabase');
              if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') await reconcileOwner(session.user.id);
            } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
              // Sessão encerrada fora do botão Sair (expirada/revogada): os dados ficam, marcados com o dono.
              setUser(null);
              setAuthProvider(null);
            }
          } catch (error) {
            console.error('Error handling auth change', error);
          } finally {
            setIsLoading(false);
          }
        }, 0);
      });
      return () => subscription.unsubscribe();
    }

    // Modo local (Dexie), sem Supabase
    (async () => {
      try {
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
      } catch (error) {
        console.error('Error initializing auth', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, passwordHash: string): Promise<boolean> => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: passwordHash, // the UI passes the plain password here
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
          id: crypto.randomUUID(),
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

  /**
   * Encerra a sessão. Com Supabase, limpa o aparelho (dados, fila, dono, calendários e perfil guardado).
   * No modo local NÃO limpa: o aparelho é a única cópia dos prontuários.
   */
  const performLogout = async () => {
    const userId = user?.id;
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      await clearLocalData();
      setDataOwner(null);
      forgetCalendarConnections();
      if (userId) {
        try { localStorage.removeItem(PROFILE_CACHE_PREFIX + userId); } catch { /* ignora */ }
      }
    }
    setUser(null);
    setAuthProvider(null);
    localStorage.removeItem('audiodash_user_id');
    setLogoutWarning(false);
    setPendingCount(0);
  };

  const logout = async (force = false) => {
    try {
      if (!force) {
        setPendingCount(isSupabaseConfigured ? await syncManager.countPending() : 0);
        setLogoutWarning(true);
        return; // Abort logout without running cleanup, show modal instead
      }
      await performLogout();
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSaveAndLogout = async () => {
    setIsLoggingOut(true);
    try {
      await syncManager.sync();
      const left = await syncManager.countPending();
      if (left > 0) {
        // O envio não terminou (sem internet, assinatura vencida, erro): não apagar nada.
        setPendingCount(left);
        return;
      }
      await performLogout();
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDiscardAndLogout = async () => {
    if (pendingCount > 0) {
      const ok = await customConfirm(
        `${pendingCount} registro(s) ainda não foram enviados para a nuvem e serão apagados deste aparelho. Esta ação não pode ser desfeita. Baixe uma cópia antes, se precisar.`,
        'Sair e descartar pendências', 'Sair e descartar', 'Cancelar'
      );
      if (!ok) return;
    }
    setIsLoggingOut(true);
    await logout(true);
  };

  const handleDiscardForeign = async () => {
    const ok = await customConfirm(
      `Os ${foreignPending} registro(s) não enviados de outra conta serão apagados deste aparelho. Esta ação não pode ser desfeita.`,
      'Descartar dados de outra conta', 'Descartar', 'Cancelar'
    );
    if (!ok || !user) return;
    await clearLocalData();
    setDataOwner(user.id);
    setForeignPending(0);
    syncManager.pullFromSupabase(user.id);
  };

  const handleLeaveForeign = async () => {
    // Sai sem tocar nos dados da outra conta, para que ela possa entrar e enviá-los.
    if (supabase) await supabase.auth.signOut();
    setForeignPending(0);
    setUser(null);
    setAuthProvider(null);
  };

  if (foreignPending > 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div role="alertdialog" aria-labelledby="foreign-title" className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200">
          <h2 id="foreign-title" className="text-lg font-bold text-slate-900 mb-2">Dados de outra conta neste aparelho</h2>
          <p className="text-sm text-slate-600 mb-5">
            Há {foreignPending} registro(s) de outra conta que ainda não foram enviados para a nuvem. Eles não serão
            enviados para a sua conta. Peça à outra pessoa que entre e sincronize, ou baixe uma cópia antes de descartar.
          </p>
          <div className="flex flex-col gap-2">
            <button onClick={handleLeaveForeign} className="px-4 py-2.5 rounded-xl bg-[#0071e3] text-white font-semibold text-sm">Sair sem alterar nada</button>
            <button onClick={() => downloadFullBackup()} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Baixar cópia dos dados</button>
            <button onClick={handleDiscardForeign} className="text-xs text-red-600 hover:underline font-medium p-1">Descartar os dados da outra conta e continuar</button>
          </div>
        </div>
      </div>
    );
  }

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
          <div role="dialog" aria-labelledby="logout-title" className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-5">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <button
                onClick={() => !isLoggingOut && setLogoutWarning(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isLoggingOut}
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 id="logout-title" className="text-xl font-bold text-slate-900 mb-2">Deseja sair do sistema?</h3>
            {authProvider === 'local' ? (
              <p className="text-slate-500 mb-6 text-sm leading-relaxed">Os dados continuam guardados neste aparelho.</p>
            ) : pendingCount > 0 ? (
              <p className="text-slate-700 mb-6 text-sm leading-relaxed">
                <strong>{pendingCount} registro(s) ainda não foram enviados para a nuvem.</strong> Ao sair, eles são apagados deste
                aparelho. Conecte-se e tente salvar de novo, ou baixe uma cópia antes de sair.
              </p>
            ) : (
              <p className="text-slate-500 mb-6 text-sm leading-relaxed">Todos os registros estão sincronizados com a nuvem.</p>
            )}

            <div className="flex gap-3 w-full mb-4">
              <button
                onClick={() => setLogoutWarning(false)}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              {authProvider === 'local' ? (
                <button onClick={() => logout(true)} className="flex-1 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white font-semibold text-sm">Sair</button>
              ) : (
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
              )}
            </div>

            {authProvider !== 'local' && (
              <div className="flex flex-col items-center gap-1">
                {pendingCount > 0 && (
                  <button onClick={() => downloadFullBackup()} disabled={isLoggingOut} className="text-xs text-slate-700 hover:underline font-medium p-1 flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Baixar cópia dos dados
                  </button>
                )}
                <button
                  onClick={handleDiscardAndLogout}
                  disabled={isLoggingOut}
                  className="text-xs text-red-500 hover:text-red-600 hover:underline font-medium p-1 disabled:opacity-50"
                >
                  {pendingCount > 0 ? `Sair e descartar ${pendingCount} registro(s) não enviado(s)` : 'Apenas sair'}
                </button>
              </div>
            )}
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
