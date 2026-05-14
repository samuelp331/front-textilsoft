import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

function Bootstrap() {
  useEffect(() => {
    try {
      const qp = new URLSearchParams(window.location.search);
      if (qp.get('page') === 'resetPassword' && qp.get('uid') && qp.get('token')) {
        sessionStorage.setItem(
          'textilsoftPwdResetParams',
          JSON.stringify({ uid: qp.get('uid'), token: qp.get('token') }),
        );
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {
      /* ignore */
    }
  }, []);
  return (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
);
