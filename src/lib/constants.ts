import { 
  Users, 
  Settings, 
  Calendar, 
  LayoutDashboard,
  PlusCircle, 
  FileText
} from 'lucide-react';

export const MILLISECONDS_IN_A_DAY = 1000 * 60 * 60 * 24;

export const navItems = [
  { label: 'Dashboard (Início)', path: '/painel', icon: LayoutDashboard },
  { label: 'Agenda', path: '/agenda', icon: Calendar },
  { label: 'Pacientes', path: '/pacientes', icon: Users },
  { label: 'Exames', path: '/exames', icon: FileText },
  { label: 'Novo Exame', path: '/exame/novo', icon: PlusCircle },
  { label: 'Configurações', path: '/configuracoes', icon: Settings },
];
