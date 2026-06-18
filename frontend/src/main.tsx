import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global fetch interceptor to append X-API-Key from localStorage
const originalFetch = window.fetch;
window.fetch = async function (input, init) {
  let url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  
  if (url.startsWith('/api/') || url.includes('/api/')) {
    init = init || {};
    init.headers = init.headers || {};
    
    const apiKey = sessionStorage.getItem('sysaware_api_key');
    if (apiKey) {
      if (init.headers instanceof Headers) {
        init.headers.set('X-API-Key', apiKey);
      } else if (Array.isArray(init.headers)) {
        const hasKey = init.headers.some(([k]) => k.toLowerCase() === 'x-api-key');
        if (!hasKey) {
          init.headers.push(['X-API-Key', apiKey]);
        }
      } else {
        init.headers = {
          ...init.headers,
          'X-API-Key': apiKey
        };
      }
    }
  }
  
  const response = await originalFetch(input, init);
  
  // Intercept 401 Unauthorized to prompt for API Key
  if (response.status === 401 && (url.startsWith('/api/') || url.includes('/api/'))) {
    const newKey = prompt('Unauthorized: Please enter your SysAware API Key to continue:');
    if (newKey) {
      sessionStorage.setItem('sysaware_api_key', newKey.trim());
      // Retry the request once
      return window.fetch(input, init);
    }
  }
  
  return response;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
