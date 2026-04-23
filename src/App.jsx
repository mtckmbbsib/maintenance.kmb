import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

import { UserManagement } from './pages/UserManagement';
import { SparePart } from './pages/SparePart';

// Placeholders for other pages
const Placeholder = ({ title }) => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-foreground/60">Halaman ini sedang dalam pengembangan.</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              
              {/* Accessible by Admin and Mekanik */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Mekanik']} />}>
                <Route path="/spare-part" element={<SparePart />} />
                <Route path="/tools" element={<Placeholder title="Tools" />} />
                <Route path="/unit" element={<Placeholder title="Unit" />} />
                <Route path="/report" element={<Placeholder title="Report" />} />
              </Route>

              {/* Only accessible by Admin */}
              <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                <Route path="/user-management" element={<UserManagement />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
