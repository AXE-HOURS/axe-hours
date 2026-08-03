import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { FirebaseProvider } from './context/FirebaseContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { CalibrationBridgeProvider } from './context/CalibrationBridgeContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirebaseProvider>
      <ToastProvider>
        <CalibrationBridgeProvider>
          <App />
        </CalibrationBridgeProvider>
      </ToastProvider>
    </FirebaseProvider>
  </StrictMode>,
);
