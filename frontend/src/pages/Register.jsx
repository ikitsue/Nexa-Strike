import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { authAPI } from '../api/supabaseApi';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../i18n';
import './Auth.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      // Supabase Auth validates this token as part of the signup request.
      const registration = await authAPI.register(email, password, username, captchaToken);
      if (registration.requiresEmailConfirmation) {
        setSuccess(t('registrationEmailConfirmation'));
        return;
      }

      await login();
      navigate('/');
    } catch (err) {
      const errorData = err.response?.data;
      
      // Display validation details if available
      if (errorData?.details && Array.isArray(errorData.details)) {
        const messages = errorData.details.map(detail => `${detail.field}: ${detail.message}`).join('\n');
        setError(messages);
      } else {
        setError(errorData?.error || err.message || t('registrationFailed'));
      }
      
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
        <h1>{t('register')}</h1>

        {error && <div className="error-message" role="alert">{error}</div>}
        {success && <div className="success-message" role="status">{success}</div>}

        <div className="form-group">
          <label htmlFor="username">{t('username')}</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={80}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">{t('email')}</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
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
            autoComplete="new-password"
            required
          />
        </div>

        <p className="auth-disclosure">
          {t('hcaptchaRegisterDisclosure')}
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

        <button type="submit" className="btn-submit">{t('register')}</button>

        <p className="auth-link">
          {t('haveAccount')} <Link to="/login">{t('login')}</Link>
        </p>
        <p className="auth-privacy-link">
          {t('signupPrivacyDisclosurePrefix')}
          <Link to="/privacy">{t('privacyPolicy').toLowerCase()}</Link>.
        </p>
      </form>
    </div>
  );
};

export default Register;
