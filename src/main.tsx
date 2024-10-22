import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import  App  from './App.tsx'
import './index.css'

import 'bootstrap/dist/css/bootstrap.min.css';
import { SocketProvider } from './Hooks/UseSocket.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
  <SocketProvider>
    <App></App>
  </SocketProvider>
  </StrictMode>,
)
