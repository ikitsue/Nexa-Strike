import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ticketsAPI } from '../api/supabaseApi';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../i18n';
import './AdminTickets.css';

const MyTickets = () => {
  const { user, authReady } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingTicketId, setSavingTicketId] = useState('');

  const loadTickets = useCallback(async () => {
    try {
      const response = await ticketsAPI.getMine();
      setTickets(response.data);
      setError('');
    } catch (loadError) {
      console.error('Failed to load your support tickets:', loadError);
      setError(t('ticketLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    loadTickets();
  }, [authReady, loadTickets, navigate, user]);

  const handleReply = async (event, ticketId) => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = new FormData(form).get('reply');
    if (typeof message !== 'string' || !message.trim()) return;

    setSavingTicketId(ticketId);
    setError('');
    try {
      await ticketsAPI.addReply(ticketId, message, user.role === 'admin' ? 'admin' : 'customer');
      form.reset();
      await loadTickets();
    } catch (replyError) {
      console.error('Failed to send support ticket reply:', replyError);
      setError(t('ticketReplyError'));
    } finally {
      setSavingTicketId('');
    }
  };

  if (!authReady || !user || loading) {
    return <div className="loading">{t('loadingTickets')}</div>;
  }

  return (
    <div className="admin-tickets-page">
      <div className="admin-tickets-container">
        <div className="admin-tickets-header">
          <div>
            <h1>🎫 {t('myTickets')}</h1>
            <p>{t('myTicketsIntro')}</p>
          </div>
        </div>

        {error && <p className="form-result form-result--error" role="alert">{error}</p>}
        {tickets.length === 0 ? (
          <div className="empty-state">
            <p>{t('noTicketsYet')}</p>
            <Link to="/contact">{t('submitTicket')}</Link>
          </div>
        ) : (
          <div className="tickets-list">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="ticket-card">
                <div className="ticket-card-top">
                  <div>
                    <h3>{ticket.title}</h3>
                    <p>{ticket.message}</p>
                  </div>
                  <span className={`ticket-badge ${ticket.status}`}>{t(ticket.status)}</span>
                </div>

                <div className="ticket-meta">
                  <span><strong>{t('category')}:</strong> {t(ticket.category)}</span>
                  <span><strong>{t('priority')}:</strong> {t(ticket.priority)}</span>
                  <span><strong>{t('updated')}:</strong> {new Date(ticket.updated_at).toLocaleString()}</span>
                </div>

                <section className="ticket-conversation" aria-label={t('ticketConversation')}>
                  <h4>{t('ticketConversation')}</h4>
                  {ticket.ticket_messages.length === 0 && <p>{t('noTicketReplies')}</p>}
                  {ticket.ticket_messages.map((reply) => (
                    <div className={`ticket-reply ${reply.author_role}`} key={reply.id}>
                      <p><strong>{reply.author_role === 'admin' ? t('supportTeam') : user?.username || t('you')}</strong></p>
                      <p>{reply.message}</p>
                      <small>{new Date(reply.created_at).toLocaleString()}</small>
                    </div>
                  ))}
                  <form className="ticket-reply-form" onSubmit={(event) => handleReply(event, ticket.id)}>
                    <label htmlFor={`reply-${ticket.id}`}>{t('writeReply')}</label>
                    <textarea
                      id={`reply-${ticket.id}`}
                      name="reply"
                      maxLength={5000}
                      rows="3"
                      required
                    />
                    <button type="submit" disabled={savingTicketId === ticket.id}>
                      {savingTicketId === ticket.id ? t('saving') : t('sendReply')}
                    </button>
                  </form>
                </section>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
