import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '../../realworld/assets/theme/styles.css';
import './app.css';
import { AuthProvider } from './auth/AuthContext';
import App from './App';

createRoot(document.getElementById('root')!).render(
  // No <StrictMode>: its dev-only double-run of effects duplicates every API call, which the parity harness compares 1:1 with Angular.
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>,
);
