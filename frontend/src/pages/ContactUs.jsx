import React from 'react';
import { Link } from 'react-router-dom';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { ticketsAPI, achievementsAPI } from '../api/supabaseApi';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../i18n';
import './ContactUs.css';

const createInitialFormData = (user) => ({
  reporterName: user?.username || '',
  reporterEmail: user?.email || '',
  title: '',
  category: 'bug',
  priority: 'normal',
  message: '',
});

const ContactUs = () => {
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const captchaRef = React.useRef(null);
  const [formData, setFormData] = React.useState(() => createInitialFormData(user));
  const [captchaToken, setCaptchaToken] = React.useState('');
  const [submissionState, setSubmissionState] = React.useState('');
  const [submissionError, setSubmissionError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [achievementError, setAchievementError] = React.useState(false);

  React.useEffect(() => {
    if (!user?.email) return;
    setFormData((current) => ({
      ...current,
      reporterName: current.reporterName || user.username || '',
      reporterEmail: user.email,
    }));
  }, [user?.email, user?.username]);

  const handleChange = (event) => {
    setSubmissionState('');
    setSubmissionError('');
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAchievementError(false);
    setSubmissionState('');
    setSubmissionError('');

    if (!captchaToken) {
      setSubmissionState('captcha');
      return;
    }

    setIsSubmitting(true);
    try {
      await ticketsAPI.create({
        reporterName: formData.reporterName.trim(),
        reporterEmail: formData.reporterEmail.trim(),
        title: formData.title.trim(),
        category: formData.category,
        priority: formData.priority,
        message: formData.message.trim(),
      }, captchaToken);

      setSubmissionState('saved');
      setFormData(createInitialFormData(user));
      if (user?.authUserId) {
        try {
          await achievementsAPI.unlock('ticket');
        } catch (error) {
          console.error('Could not unlock ticket achievement:', error);
          setAchievementError(true);
        }
      }
    } catch (error) {
      console.error('Could not create support ticket:', error);
      setSubmissionState('error');
      setSubmissionError(error.message || t('ticketSaveError'));
    } finally {
      captchaRef.current?.resetCaptcha();
      setCaptchaToken('');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-container">
        <h1>{t('contactTitle') || t('contact')}</h1>
        <p className="contact-intro">{t('contactPageIntro')}</p>

        <div className="contact-content">
          <div className="contact-form-section">
            <h2>{t('sendMessageTitle')}</h2>
            <form onSubmit={handleSubmit} className="contact-form">
              <p className="form-note ticket-warning" role="note">
                {t('ticketStorageNotice')}
                {' '}
                <Link to="/privacy">{t('privacyPolicy')}</Link>
              </p>
              {submissionState === 'saved' && (
                <p className="form-result" role="status">
                  {t('ticketCreated')}
                  {user && <> {' '}<Link to="/my-tickets">{t('myTickets')}</Link></>}
                </p>
              )}
              {submissionState === 'captcha' && (
                <p className="form-result form-result--error" role="alert">{t('ticketCaptchaRequired')}</p>
              )}
              {submissionState === 'error' && (
                <p className="form-result form-result--error" role="alert">
                  {submissionError || t('ticketSaveError')}
                </p>
              )}
              {achievementError && (
                <p className="form-result form-result--error" role="alert">
                  {t('ticketAchievementError')}
                </p>
              )}

              <div className="form-group">
                <label htmlFor="reporterName">{t('name')}</label>
                <input
                  type="text"
                  id="reporterName"
                  name="reporterName"
                  value={formData.reporterName}
                  onChange={handleChange}
                  maxLength={80}
                  autoComplete="name"
                  placeholder={t('yourName')}
                />
                <small>{t('optional')}</small>
              </div>

              <div className="form-group">
                <label htmlFor="reporterEmail">{t('email')}</label>
                <input
                  type="email"
                  id="reporterEmail"
                  name="reporterEmail"
                  value={formData.reporterEmail}
                  onChange={handleChange}
                  maxLength={254}
                  autoComplete="email"
                  placeholder={t('yourEmail')}
                  required
                  readOnly={Boolean(user)}
                />
                {user
                  ? <small>{t('ticketAccountEmailNotice')}</small>
                  : <small>{t('ticketGuestEmailNotice')}</small>}
              </div>

              <div className="form-group">
                <label htmlFor="title">{t('subject')}</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  maxLength={120}
                  placeholder={t('subjectPlaceholder')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">{t('ticketCategory')}</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="bug">{t('bug')}</option>
                  <option value="feature">{t('feature')}</option>
                  <option value="account">{t('account')}</option>
                  <option value="other">{t('other')}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="priority">{t('priority')}</label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="normal">{t('normal')}</option>
                  <option value="high">{t('high')}</option>
                  <option value="urgent">{t('urgent')}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="message">{t('message')}</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  maxLength={5000}
                  placeholder={t('messagePlaceholder')}
                  rows="6"
                />
              </div>

              <p className="form-note">
                {t('hcaptchaTicketDisclosure')}
                <a href="https://www.hcaptcha.com/privacy" target="_blank" rel="noopener noreferrer">
                  hCaptcha {t('privacyPolicy').toLowerCase()}
                </a>
              </p>
              <div className="form-group">
                <HCaptcha
                  ref={captchaRef}
                  sitekey="f0d01e14-76a0-4cee-be80-171ae994962c"
                  onVerify={setCaptchaToken}
                  onExpire={() => setCaptchaToken('')}
                />
              </div>

              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? t('saving') : t('submitTicket')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
