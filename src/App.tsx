import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import CheckerPanel from './CheckerPanel';

function App() {
  return (
    <Router>
      <Routes>
        {/* This makes the Login page the very first thing users see */}
        <Route path="/" element={<Login />} />
        
        {/* This is the dashboard route we protect */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/checker-panel" element={<CheckerPanel />} />
      </Routes>
    </Router>
  );
}

export default App;