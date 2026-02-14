import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './LandingPage';
import { Changelog } from './Changelog';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/changelog" element={<Changelog />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
