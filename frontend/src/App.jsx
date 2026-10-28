import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { CookieConsentProvider, useCookieConsent } from '../../shared/consent/CookieConsent';
import Layout from './components/Layout';
import Home from './pages/Home';
import Maps from './pages/Maps';
import MapDetail from './pages/MapDetail';
import MapEditor from './pages/MapEditor';
import Suggestions from './pages/Suggestions';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import UtilityManager from './pages/UtilityManager';
import UtilityDatabase from './pages/UtilityDatabase';
import UtilityDetail from './pages/UtilityDetail';
import Download from './pages/Download';
import Privacy from './pages/Privacy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import LegalNotice from './pages/LegalNotice';
import ContactUs from './pages/ContactUs';
import AdminTickets from './pages/AdminTickets';
import MyTickets from './pages/MyTickets';
import Credits from './pages/Credits';
import EasterEgg from './pages/EasterEgg';
import NotFound from './pages/NotFound';
import { useAuthStore } from './store/authStore';
import { useLanguage } from './i18n';

function AdminOnly({ children }) {
  const { user, authReady } = useAuthStore();
  const { t } = useLanguage();

  if (!authReady) {
    return <div className="loading">{t('checkingAccess')}</div>;
  }

  return user?.role === 'admin' ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const speedInsightsScriptSrc = import.meta.env.VITE_SPEED_INSIGHTS_SCRIPT_SRC;
  const { preferences } = useCookieConsent();
  const navigate = useNavigate();

  React.useEffect(() => {
    const sequence = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
    ];
    let progress = 0;
    let resetTimer;

    const handleKeyDown = (event) => {
      const target = event.target;
      if (
        event.repeat
        || target instanceof HTMLElement
          && target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')
      ) {
        return;
      }

      if (event.key === sequence[progress]) {
        progress += 1;
      } else {
        progress = event.key === sequence[0] ? 1 : 0;
      }

      window.clearTimeout(resetTimer);
      if (progress === sequence.length) {
        progress = 0;
        navigate('/Easter-egg');
      } else if (progress > 0) {
        resetTimer = window.setTimeout(() => {
          progress = 0;
        }, 2500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(resetTimer);
    };
  }, [navigate]);

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/maps" element={<Maps />} />
          <Route path="/db" element={<UtilityDatabase />} />
          <Route path="/db/:mapId/:pointId" element={<UtilityDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/download" element={<Download />} />
          <Route path="/map/:id" element={<MapDetail />} />
          <Route path="/map/:id/edit" element={<AdminOnly><MapEditor /></AdminOnly>} />
          <Route path="/suggestions" element={<Suggestions />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
          <Route path="/admin/tickets" element={<AdminOnly><AdminTickets /></AdminOnly>} />
          <Route path="/utility-manager" element={<AdminOnly><UtilityManager /></AdminOnly>} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route path="/legal" element={<LegalNotice />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/my-tickets" element={<MyTickets />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="/Easter-egg" element={<EasterEgg />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      {preferences.performance && <SpeedInsights scriptSrc={speedInsightsScriptSrc} />}
      {preferences.performance && <Analytics />}
    </>
  );
}

function App() {
  const { language, t } = useLanguage();
  React.useEffect(() => {
    document.documentElement.lang = language;
    document.title = `NexaStrike | ${t('appTitle')}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('homePageDescription'));
  }, [language, t]);

  return (
    <Router>
      <CookieConsentProvider language={language}>
        <AppRoutes />
      </CookieConsentProvider>
    </Router>
  );
}

export default App;
