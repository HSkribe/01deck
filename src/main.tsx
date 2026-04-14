import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { AuthProvider, useAuth } from './app/context/AuthContext';
import { AuthModal } from './app/components/AuthModal';
import { PRODUCT_DOCUMENT_TITLE } from './app/utils/productMode';
import './styles/index.css';
import './styles/ondeck.css';
import '@xyflow/react/dist/style.css';

document.title = PRODUCT_DOCUMENT_TITLE;

function AppRoot() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <App /> : <AuthModal />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  </React.StrictMode>,
);
