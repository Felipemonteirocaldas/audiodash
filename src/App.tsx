import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Exams from './pages/Exams';
import NewExam from './pages/NewExam';
import Settings from './pages/Settings';
import CompareExams from './pages/CompareExams';
import AnamnesisForm from './pages/AnamnesisForm';
import EvolutionControl from './pages/EvolutionControl';
import Agenda from './pages/Agenda';
import Paywall from './pages/Paywall';
import Manual from './pages/Manual';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Dialogs } from './components/ui/Dialogs';

export default function App() {
  return (
    <AuthProvider>
      <Dialogs />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/planos" element={<Paywall />} />
        <Route path="/manual" element={<Manual />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/painel" element={<Dashboard />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/pacientes" element={<Patients />} />
            <Route path="/exames" element={<Exams />} />
            <Route path="/exame/novo/:patientId?" element={<NewExam />} />
            <Route path="/exame/:examId" element={<NewExam />} />
            <Route path="/comparar/:examId1/:examId2" element={<CompareExams />} />
            <Route path="/anamnese/novo/:patientId" element={<AnamnesisForm />} />
            <Route path="/anamnese/:anamnesisId" element={<AnamnesisForm />} />
            <Route path="/evolucao/:patientId" element={<EvolutionControl />} />
            <Route path="/configuracoes" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
