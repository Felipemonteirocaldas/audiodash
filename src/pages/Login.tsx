import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ArrowLeft, ShieldCheck, User, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LogoAD } from '@/components/LogoAD';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(() => new URLSearchParams(window.location.search).has('cadastro'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const navigate = useNavigate();
  const { login, loginWithGoogle, register, isAuthenticated } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      await loginWithGoogle();
      // Supabase handles the redirect automatically for OAuth
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao tentar fazer login com o Google.');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/painel');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        if (!name.trim()) {
          throw new Error('O nome é obrigatório.');
        }
        if (!acceptedTerms) {
          throw new Error('Você precisa aceitar os Termos de Uso e a Política de Privacidade.');
        }
        const { requireEmailConfirmation } = await register(name, email, password);
        if (requireEmailConfirmation) {
          setConfirmationEmailSent(true);
          setIsLoading(false);
          return; // Do not navigate yet
        }
      } else {
        const success = await login(email, password);
        if (!success) {
          throw new Error('E-mail ou senha incorretos.');
        }
      }
      navigate('/painel');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Container Principal */}
      <div className="max-w-5xl w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Seção Esquerda - Branding/Visual */}
        <div className="hidden md:flex md:w-1/2 bg-slate-900 p-12 flex-col justify-between relative overflow-hidden">
          {/* Efeitos de Fundo */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-1/2 -right-24 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          </div>

          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-8 group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Voltar ao site
            </Link>
            <div className="flex items-center gap-3 text-white mb-16">
              <LogoAD className="w-16 h-auto" />
              <span className="text-3xl font-bold tracking-tight">AudioDash</span>
            </div>
            
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                Sua clínica no <br/><span className="text-indigo-400">próximo nível</span>.
              </h1>
              <p className="text-slate-400 text-lg max-w-sm">
                Simplifique seus atendimentos, gerencie laudos e acompanhe a evolução dos seus pacientes em um só lugar.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 w-fit">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-white font-medium text-sm">Dados Seguros</p>
              <p className="text-slate-400 text-xs">Armazenamento local persistente</p>
            </div>
          </div>
        </div>

        {/* Seção Direita - Formulário */}
        <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white z-10 overflow-y-auto">
          
          <div className="md:hidden flex items-center gap-3 text-slate-900 mb-10">
            <LogoAD className="w-12 h-auto" />
            <span className="text-2xl font-bold tracking-tight">AudioDash</span>
          </div>

          {confirmationEmailSent ? (
            <div className="flex flex-col items-center justify-center text-center space-y-6 py-8 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
                <Mail className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Verifique seu e-mail</h2>
              <p className="text-slate-500 max-w-sm">
                Enviamos um link de confirmação para <span className="font-semibold text-slate-700">{email}</span>. 
                Por favor, verifique sua caixa de entrada para ativar sua conta.
              </p>
              <button
                onClick={() => {
                  setConfirmationEmailSent(false);
                  setIsRegistering(false);
                  setPassword('');
                }}
                className="mt-4 px-6 py-2.5 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-xl font-semibold transition-colors"
              >
                Voltar para o login
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  {isRegistering ? 'Criar Conta' : 'Bem-vindo de volta'}
                </h2>
                <p className="text-slate-500">
                  {isRegistering 
                    ? 'Preencha os dados abaixo para começar.' 
                    : 'Insira suas credenciais para acessar o painel.'}
                </p>

                {isRegistering && (
                  <div className="mt-6 flex items-center gap-0">
                    {/* Etapa 1 - Ativa */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-indigo-200">1</div>
                      <span className="text-sm font-semibold text-indigo-600">Criar conta</span>
                    </div>
                    <div className="flex-1 h-px bg-slate-200 mx-3"></div>
                    {/* Etapa 2 */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs font-bold">2</div>
                      <span className="text-sm font-medium text-slate-400">Escolher plano</span>
                    </div>
                    <div className="flex-1 h-px bg-slate-200 mx-3"></div>
                    {/* Etapa 3 */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs font-bold">3</div>
                      <span className="text-sm font-medium text-slate-400">Acessar</span>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full mb-6 flex justify-center items-center gap-3 py-3.5 px-4 border border-slate-200 rounded-xl shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar com o Google
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">Ou continue com e-mail</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {isRegistering && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="name">
                      Nome Completo
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="name"
                        type="text"
                        required={isRegistering}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="Seu nome"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="email">
                    E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="doutor@clinica.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="password">
                      Senha
                    </label>
                    {!isRegistering && (
                      <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                        Esqueceu a senha?
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {isRegistering && (
                  <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-5 h-5 rounded-md border-2 border-slate-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 transition-all flex items-center justify-center">
                        {acceptedTerms && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                    <span className="text-xs text-slate-600 leading-relaxed">
                      Li e concordo com os{' '}
                      <a href="/termos" target="_blank" className="text-indigo-600 hover:text-indigo-500 font-semibold underline underline-offset-2">Termos de Uso</a>
                      {' '}e a{' '}
                      <a href="/privacidade" target="_blank" className="text-indigo-600 hover:text-indigo-500 font-semibold underline underline-offset-2">Política de Privacidade</a>
                      {' '}do AudioDash.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 mt-2 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {isRegistering ? 'Criar Conta' : 'Entrar'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center text-sm text-slate-500">
                {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}{' '}
                <button
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError(null);
                  }}
                  className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors bg-transparent border-none p-0 cursor-pointer"
                >
                  {isRegistering ? 'Fazer login' : 'Criar uma conta'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
