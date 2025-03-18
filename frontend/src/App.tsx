import React from 'react';


import Login from './pages/Login';
import FaceVerification from './pages/FaceVerification';
import Dashboard from './pages/DashBoard';
import RecordQuery from './pages/RecordQuery';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import InsightsDashboard from './pages/InsightsDashboard';

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      
      <Router>
        <Routes>
          
          <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
          <Route path="/" element={<Login />} />
          <Route path="/face-verification" element={<FaceVerification />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/record-query" element={<RecordQuery/>}/>

          <Route path="/insights" element={<InsightsDashboard />} />
          <Route path="/manager-dashboard" element={<ManagerDashboard />} />

        </Routes>
      </Router>




    </div>
  );
};

export default App;
