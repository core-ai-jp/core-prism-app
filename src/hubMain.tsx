import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Hub from './hub/Hub';
createRoot(document.getElementById('root')!).render(<StrictMode><Hub/></StrictMode>);
