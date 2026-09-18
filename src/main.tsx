import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { AuthProvider, useAuth } from './app/context/AuthContext';
import { AuthModal } from './app/components/AuthModal';
import { HumanProfileStep } from './app/components/HumanProfileStep';
import { PRODUCT_DOCUMENT_TITLE } from './app/utils/productMode';
import './styles/index.css';
import './styles/ondeck.css';
import '@xyflow/react/dist/style.css';

document.title = PRODUCT_DOCUMENT_TITLE;

function profileStepSeenKey(userId: string) {
  return `01deck:profile-step-seen:${userId}`;
}

function AppRoot() {
  const { isAuthenticated, user } = useAuth();
  // Re-read per signed-in user id, not just once at mount — switching
  // accounts in the same browser (or a guest session) must not skip a user
  // who hasn't seen this step yet just because a previous one had.
  const [seenForUserId, setSeenForUserId] = useState<string | null>(null);

  if (!isAuthenticated || !user) return <AuthModal />;

  const alreadySeen = seenForUserId === user.id || localStorage.getItem(profileStepSeenKey(user.id)) === 'true';
  if (!alreadySeen) {
    return (
      <HumanProfileStep
        onDone={() => {
          localStorage.setItem(profileStepSeenKey(user.id), 'true');
          setSeenForUserId(user.id);
        }}
      />
    );
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  </React.StrictMode>,
);
