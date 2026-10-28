import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { CookieConsentProvider, useCookieConsent } from '../../shared/consent/CookieConsent';
import Layout from './components/Layout';
const Home = lazy(() => import('./pages/Home'));
const Maps = lazy(() => import('./pages/Maps'));
const MapDetail = lazy(() => import('./pages/MapDetail'));
const MapEditor = lazy(() => import('./pages/MapEditor'));
const Suggestions = lazy(() => import('./pages/Suggestions'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Admin = lazy(() => import('./pages/Admin'));
const UtilityManager = lazy(() => import('./pages/UtilityManager'));
const UtilityDatabase = lazy(() => import('./pages/UtilityDatabase'));
const UtilityDetail = lazy(() => import('./pages/UtilityDetail'));
const Privacy = lazy(() => import('./pages/Privacy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const LegalNotice = lazy(() => import('./pages/LegalNotice'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const AdminTickets = lazy(() => import('./pages/AdminTickets'));
const MyTickets = lazy(() => import('./pages/MyTickets'));
const Credits = lazy(() => import('./pages/Credits'));
const EasterEgg = lazy(() => import('./pages/EasterEgg'));
const NotFound = lazy(() => import('./pages/NotFound'));
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
  const canLoadWebAnalytics = !window.electron && window.location.protocol !== 'file:';

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
      <Suspense fallback={<div role="status">Loading...</div>}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/maps" element={<Maps />} />
            <Route path="/db" element={<UtilityDatabase />} />
            <Route path="/db/:mapId/:pointId" element={<UtilityDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/download" element={<Navigate to="/" replace />} />
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
      </Suspense>
      {canLoadWebAnalytics && preferences.performance && <SpeedInsights scriptSrc={speedInsightsScriptSrc} />}
      {canLoadWebAnalytics && preferences.performance && <Analytics />}
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
