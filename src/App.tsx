import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import NewExam from './pages/NewExam';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="exam/new/:patientId?" element={<NewExam />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
