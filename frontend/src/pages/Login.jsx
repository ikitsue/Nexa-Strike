import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { authAPI } from '../api/supabaseApi';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../i18n';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { t } = useLanguage();

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate captcha was completed
    if (!captchaToken) {
      setError(t('captchaError'));
      return;
    }

    try {
      const response = await authAPI.login(email, password, captchaToken);
      await login(response.data, response.token);
      navigate('/');
    } catch (err) {
      const errorData = err.response?.data;
      let errorMsg = errorData?.error || t('loginFailed');
      
      // Show ban details if user is banned
      if (err.response?.status === 403 && errorData?.ban_reason) {
        errorMsg += `\n\nReason: ${errorData.ban_reason}`;
      }
      
      setError(errorMsg);
      // Reset captcha on error
      if (captchaRef.current) {
        captchaRef.current.resetCaptcha();
        setCaptchaToken('');
      }
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>{t('login')}</h1>

        {error && <div className="error-message" role="alert">{error}</div>}

        <div className="form-group">
          <label htmlFor="email">{t('email')}</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(error)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">{t('password')}</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-invalid={Boolean(error)}
            required
          />
        </div>

        <p className="auth-disclosure">
          {t('hcaptchaLoginDisclosure')}
          <a href="https://www.hcaptcha.com/privacy" target="_blank" rel="noopener noreferrer">
            hCaptcha {t('privacyPolicy').toLowerCase()}
          </a>
        </p>
        <div className="form-group">
          <HCaptcha
            ref={captchaRef}
            sitekey="f0d01e14-76a0-4cee-be80-171ae994962c"
            onVerify={handleCaptchaChange}
          />
        </div>

        <button type="submit" className="btn-submit">{t('login')}</button>

        <p className="auth-link">
          {t('noAccount')} <Link to="/register">{t('register')}</Link>
        </p>
        <p className="auth-privacy-link">
          <Link to="/privacy">{t('privacyPolicy')}</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
