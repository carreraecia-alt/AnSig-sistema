import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Skip PWA registration and remove manifest file link dynamically if client form is active to prevent installation prompts
const params = new URLSearchParams(window.location.search);
const isClientForm = params.get("idAtendimento");

if (isClientForm) {
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    manifestLink.remove();
    console.log("Client form active - Dynamically removed manifest.json to prevent installation options.");
  }
}

// Detect if we are in a development/preview environment
const isDev = (import.meta as any).env?.DEV || 
              window.location.hostname.includes('localhost') || 
              window.location.hostname.includes('ais-dev-') ||
              window.location.hostname.includes('stackblitz') || 
              window.location.hostname.includes('webcontainer') || 
              window.location.hostname.includes('googleusercontent');

if (isDev) {
  console.log('🛠️ Ambiente de Preview/Desenvolvimento detectado. Limpando cache e Service Workers...');
  
  // Desregistra todos os Service Workers ativos para evitar cache obsoleto de index.html
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((boolean) => {
          if (boolean) console.log('✅ Service Worker antigo desregistrado com sucesso.');
        });
      }
    });
  }

  // Limpa os caches de requisição do navegador
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
      console.log('🗑️ Caches do navegador limpos.');
    });
  }
} else if ("serviceWorker" in navigator && !isClientForm) {
  // Register Service Worker in production/shared app
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then((registration) => {
        console.log("Service Worker registered successfully with scope:", registration.scope);
      })
      .catch((error) => {
        console.warn("Service Worker registration failed:", error);
      });
  });
}

// Secure React rendering
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
