import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { PRODUCT_DOCUMENT_TITLE } from './app/utils/productMode';
import './styles/index.css';
import './styles/ondeck.css';
import '@xyflow/react/dist/style.css';

document.title = PRODUCT_DOCUMENT_TITLE;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
