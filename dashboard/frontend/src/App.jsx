import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import MobileCamera from './pages/MobileCamera';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(() => {
    return window.location.pathname === '/camera' ? 'camera' : 'dashboard';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname === '/camera' ? 'camera' : 'dashboard');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (route) => {
    const path = route === 'camera' ? '/camera' : '/';
    window.history.pushState({}, '', path);
    setCurrentRoute(route);
  };

  if (currentRoute === 'camera') {
    return <MobileCamera onBack={() => navigateTo('dashboard')} />;
  }

  return <Dashboard onNavigateToCamera={() => navigateTo('camera')} />;
}
