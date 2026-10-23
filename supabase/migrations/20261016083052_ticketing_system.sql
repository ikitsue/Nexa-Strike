CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  reporter_name VARCHAR(80),
  reporter_email VARCHAR(254) NOT NULL,
  title VARCHAR(120) NOT NULL,
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 5000),
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'account', 'other')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  assigned_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tickets_title_not_empty CHECK (length(btrim(title)) > 0),
  CONSTRAINT tickets_email_not_empty CHECK (length(btrim(reporter_email)) > 0)
);

CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_email VARCHAR(254) NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('customer', 'admin')),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ticket_messages_message_not_empty CHECK (length(btrim(message)) > 0)
);

CREATE INDEX tickets_owner_created_idx
  ON public.tickets (owner_id, created_at DESC);
CREATE INDEX tickets_email_created_idx
  ON public.tickets (lower(reporter_email), created_at DESC);
CREATE INDEX ticket_messages_ticket_created_idx
  ON public.ticket_messages (ticket_id, created_at);

CREATE OR REPLACE FUNCTION private.can_view_ticket(
  ticket_owner_id UUID,
  ticket_reporter_email TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT (SELECT private.is_admin())
    OR auth.uid() = ticket_owner_id
    OR (
      ticket_owner_id IS NULL
      AND auth.uid() IS NOT NULL
      AND lower(ticket_reporter_email) = lower(auth.email())
      AND EXISTS (
        SELECT 1
        FROM auth.users AS auth_user
        WHERE auth_user.id = auth.uid()
          AND auth_user.email_confirmed_at IS NOT NULL
      )
    );
$function$;

REVOKE ALL ON FUNCTION private.can_view_ticket(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_ticket(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION private.update_ticket_updated_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.update_ticket_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tickets_update_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION private.update_ticket_updated_at();

CREATE OR REPLACE FUNCTION private.touch_ticket_after_message()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.tickets
  SET updated_at = now(),
      status = CASE
        WHEN NEW.author_role = 'customer' AND status = 'resolved' THEN 'open'
        ELSE status
      END
  WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.touch_ticket_after_message() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER ticket_messages_touch_ticket
AFTER INSERT ON public.ticket_messages
FOR EACH ROW
EXECUTE FUNCTION private.touch_ticket_after_message();

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.tickets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ticket_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.tickets TO authenticated;
GRANT SELECT, INSERT ON TABLE public.ticket_messages TO authenticated;

CREATE POLICY "Ticket owners and administrators can view tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (private.can_view_ticket(owner_id, reporter_email));

CREATE POLICY "Administrators can update tickets"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Administrators can delete tickets"
  ON public.tickets
  FOR DELETE
  TO authenticated
  USING ((SELECT private.is_admin()));

CREATE POLICY "Ticket participants and administrators can view messages"
  ON public.ticket_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tickets AS ticket
      WHERE ticket.id = ticket_id
        AND private.can_view_ticket(ticket.owner_id, ticket.reporter_email)
    )
  );

CREATE POLICY "Ticket participants can reply as customers"
  ON public.ticket_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND author_role = 'customer'
    AND lower(author_email) = lower((SELECT auth.email()))
    AND EXISTS (
      SELECT 1
      FROM public.tickets AS ticket
      WHERE ticket.id = ticket_id
        AND private.can_view_ticket(ticket.owner_id, ticket.reporter_email)
        AND NOT (SELECT private.is_admin())
    )
  );

CREATE POLICY "Administrators can reply as staff"
  ON public.ticket_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND author_role = 'admin'
    AND (SELECT private.is_admin())
  );