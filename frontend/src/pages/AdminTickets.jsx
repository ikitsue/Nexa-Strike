import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { ticketsAPI } from '../api/supabaseApi';
import { useLanguage } from '../i18n';
import './AdminTickets.css';

const AdminTickets = () => {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingTicketId, setSavingTicketId] = useState('');

  const loadTickets = useCallback(async () => {
    try {
      const response = await ticketsAPI.getAll();
      setTickets(response.data);
      setError('');
    } catch (loadError) {
      console.error('Failed to load support tickets:', loadError);
      setError(t('ticketLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const stats = useMemo(() => ({
    open: tickets.filter((ticket) => ticket.status === 'open').length,
    assigned: tickets.filter((ticket) => ticket.status === 'in_progress').length,
    resolved: tickets.filter((ticket) => ticket.status === 'resolved').length,
    total: tickets.length,
  }), [tickets]);

  const runTicketAction = async (ticketId, action) => {
    setSavingTicketId(ticketId);
    setError('');
    try {
      await action();
      await loadTickets();
    } catch (actionError) {
      console.error('Failed to update support ticket:', actionError);
      setError(t('ticketUpdateError'));
    } finally {
      setSavingTicketId('');
    }
  };

  const handleReply = async (event, ticketId) => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = new FormData(form).get('reply');
    if (typeof message !== 'string' || !message.trim()) return;

    await runTicketAction(ticketId, async () => {
      await ticketsAPI.addReply(ticketId, message, 'admin');
      form.reset();
    });
  };

  const handleDelete = (ticketId) => {
    if (!window.confirm(t('confirmDeleteTicket'))) return;
    runTicketAction(ticketId, () => ticketsAPI.delete(ticketId));
  };

  if (loading) return <div className="loading">{t('loadingTickets')}</div>;

  return (
    <div className="admin-tickets-page">
      <div className="admin-tickets-container">
        <div className="admin-tickets-header">
          <div>
            <h1>🎫 {t('ticketManagement')}</h1>
            <p>{t('ticketManagementIntro')}</p>
          </div>
          <div className="admin-tickets-stats">
            <div><strong>{stats.total}</strong><span>{t('total')}</span></div>
            <div><strong>{stats.open}</strong><span>{t('open')}</span></div>
            <div><strong>{stats.assigned}</strong><span>{t('inProgress')}</span></div>
            <div><strong>{stats.resolved}</strong><span>{t('resolved')}</span></div>
          </div>
        </div>

        {error && <p className="form-result form-result--error" role="alert">{error}</p>}
        {tickets.length === 0 ? (
          <div className="empty-state"><p>{t('noTicketsYet')}</p></div>
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
                  <span><strong>{t('reporter')}:</strong> {ticket.reporter_name || t('unknown')}</span>
                  <span><strong>{t('email')}:</strong> {ticket.reporter_email}</span>
                  <span><strong>{t('category')}:</strong> {t(ticket.category)}</span>
                  <span><strong>{t('priority')}:</strong> {t(ticket.priority)}</span>
                </div>

                <div className="ticket-meta">
                  <span><strong>{t('assignedTo')}:</strong> {ticket.assigned_to || t('unassigned')}</span>
                  <span><strong>{t('created')}:</strong> {new Date(ticket.created_at).toLocaleString()}</span>
                </div>

                <section className="ticket-conversation" aria-label={t('ticketConversation')}>
                  <h4>{t('ticketConversation')}</h4>
                  {ticket.ticket_messages.map((reply) => (
                    <div className={`ticket-reply ${reply.author_role}`} key={reply.id}>
                      <p><strong>{reply.author_role === 'admin' ? t('supportTeam') : reply.author_username || reply.author_email}</strong></p>
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

                <div className="ticket-actions">
                  {!ticket.assigned_to && (
                    <button
                      disabled={savingTicketId === ticket.id}
                      onClick={() => runTicketAction(ticket.id, () => ticketsAPI.assign(
                        ticket.id,
                        user?.username || user?.email || 'Admin'
                      ))}
                    >
                      {t('takeCharge')}
                    </button>
                  )}
                  {ticket.status !== 'in_progress' && (
                    <button
                      disabled={savingTicketId === ticket.id}
                      onClick={() => runTicketAction(
                        ticket.id,
                        () => ticketsAPI.updateStatus(ticket.id, 'in_progress')
                      )}
                    >
                      {t('markInProgress')}
                    </button>
                  )}
                  {ticket.status !== 'resolved' && (
                    <button
                      disabled={savingTicketId === ticket.id}
                      onClick={() => runTicketAction(
                        ticket.id,
                        () => ticketsAPI.updateStatus(ticket.id, 'resolved')
                      )}
                    >
                      {t('markResolved')}
                    </button>
                  )}
                  {ticket.status !== 'open' && (
                    <button
                      disabled={savingTicketId === ticket.id}
                      onClick={() => runTicketAction(
                        ticket.id,
                        () => ticketsAPI.updateStatus(ticket.id, 'open')
                      )}
                    >
                      {t('reopen')}
                    </button>
                  )}
                  <button
                    className="danger"
                    disabled={savingTicketId === ticket.id}
                    onClick={() => handleDelete(ticket.id)}
                  >
                    {t('delete')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTickets;
