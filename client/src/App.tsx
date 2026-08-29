import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Appeals from './pages/Appeals';
import Login from './pages/Login';
import ModelVersions from './pages/ModelVersions';
import Records from './pages/Records';
import Review from './pages/Review';
import Rules from './pages/Rules';
import Stats from './pages/Stats';
import Submit from './pages/Submit';

function RequireAuth({ children }: { children: React.ReactElement }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Submit />} />
        <Route path="review" element={<Review />} />
        <Route path="appeals" element={<Appeals />} />
        <Route path="rules" element={<Rules />} />
        <Route path="models" element={<ModelVersions />} />
        <Route path="stats" element={<Stats />} />
        <Route path="records" element={<Records />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
