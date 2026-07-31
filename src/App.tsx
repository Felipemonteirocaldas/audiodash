import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import NewExam from './pages/NewExam';
import Settings from './pages/Settings';
import CompareExams from './pages/CompareExams';
import AnamnesisForm from './pages/AnamnesisForm';
import EvolutionControl from './pages/EvolutionControl';
import Agenda from './pages/Agenda';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="patients" element={<Patients />} />
            <Route path="exam/new/:patientId?" element={<NewExam />} />
            <Route path="exam/:examId" element={<NewExam />} />
            <Route path="compare/:examId1/:examId2" element={<CompareExams />} />
            <Route path="anamnesis/new/:patientId" element={<AnamnesisForm />} />
            <Route path="anamnesis/:anamnesisId" element={<AnamnesisForm />} />
            <Route path="evolution/:patientId" element={<EvolutionControl />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
