
-- Roles enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- One-shot bootstrap: any authenticated user can claim admin only if no admin exists yet.
CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing int;
BEGIN
  SELECT count(*) INTO existing FROM public.user_roles WHERE role = 'admin';
  IF existing > 0 THEN RETURN false; END IF;
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END; $$;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Site settings: KV for theme, IPs, hero, maintenance, seo, etc.
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read site_settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins write site_settings" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  published boolean NOT NULL DEFAULT true,
  pinned boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published announcements" ON public.announcements FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "admins full announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- FAQ
CREATE TABLE public.faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faq TO anon, authenticated;
GRANT ALL ON public.faq TO service_role;
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read faq" ON public.faq FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "admins full faq" ON public.faq FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER faq_updated_at BEFORE UPDATE ON public.faq FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Staff
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  minecraft_username text,
  discord_handle text,
  bio text,
  avatar_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff TO anon, authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read staff" ON public.staff FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins full staff" ON public.staff FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Store categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins full categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  sale_price numeric(10,2),
  image_url text,
  badge text,
  featured boolean NOT NULL DEFAULT false,
  in_stock boolean NOT NULL DEFAULT true,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read products" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins full products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Coupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  percent_off int,
  amount_off numeric(10,2),
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins full coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Discord webhooks (per event type)
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL UNIQUE,  -- purchase, order, ticket, contact, announcement, staff_action, admin, audit
  label text NOT NULL,
  url text,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.webhooks TO authenticated;
GRANT ALL ON public.webhooks TO service_role;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins full webhooks" ON public.webhooks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER webhooks_updated_at BEFORE UPDATE ON public.webhooks FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Audit logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text,
  entity_id text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed initial data
INSERT INTO public.site_settings(key, value) VALUES
  ('branding', jsonb_build_object(
    'siteName','BlazeMC',
    'tagline','A modern Minecraft SMP — land claims, player economy, weekly events. Java + Bedrock.',
    'world','overworld'
  )),
  ('server', jsonb_build_object(
    'javaIp','play.blazemc.in',
    'bedrockIp','bedrock.blazemc.in:19132',
    'discordUrl','https://discord.gg/7AsNnQd9Mk',
    'motd','Welcome to BlazeMC — join the fire. Weekend PvP Saturday 8PM IST.'
  )),
  ('hero', jsonb_build_object(
    'title','BLAZEMC',
    'eyebrow','Semi-vanilla • Java + Bedrock',
    'tag','Land claims, player-run economy, weekly events. Bring your friends. Build something legendary.',
    'ctaLabel','Join Discord'
  )),
  ('social', jsonb_build_object(
    'discord','https://discord.gg/7AsNnQd9Mk',
    'youtube','',
    'instagram','',
    'twitter',''
  )),
  ('maintenance', jsonb_build_object('enabled', false, 'message', 'We''ll be right back — server maintenance in progress.')),
  ('seo', jsonb_build_object(
    'title','BlazeMC — Minecraft SMP',
    'description','BlazeMC — an Indian community Minecraft SMP. Land claims, player economy, weekly events. Java + Bedrock supported.'
  ));

INSERT INTO public.webhooks(event_type, label, enabled) VALUES
  ('purchase','Purchase log', true),
  ('order','Order log', true),
  ('ticket','Ticket log', true),
  ('contact','Contact form log', true),
  ('announcement','Announcement webhook', true),
  ('staff_action','Staff action log', true),
  ('admin','Admin activity log', true),
  ('audit','Audit log', true);

INSERT INTO public.announcements(title, body, pinned, sort_order) VALUES
  ('Welcome to BlazeMC 2.0', 'Fresh season, new economy, weekly PvP events. Come say hi in Discord!', true, 1),
  ('Bedrock crossplay is live', 'You can now join from Pocket / Console / Windows 10. Use bedrock.blazemc.in:19132.', false, 2);

INSERT INTO public.faq(question, answer, sort_order) VALUES
  ('What version does BlazeMC run?', 'Latest release Java. Bedrock crossplay via Geyser.', 1),
  ('Is there PvP?', 'PvP is opt-in in the world and always on in the weekly Arena.', 2),
  ('How do I get a rank?', 'Grab one from the in-game shop or the /store page.', 3);

INSERT INTO public.categories(name, slug, sort_order) VALUES
  ('Ranks','ranks',1),
  ('Keys & Crates','keys',2),
  ('Cosmetics','cosmetics',3);

INSERT INTO public.products(category_id, name, slug, description, price, sale_price, badge, featured, sort_order, perks) VALUES
  ((SELECT id FROM public.categories WHERE slug='ranks'), 'Ember Rank', 'ember-rank', 'Entry-level rank with prefix, /fly in claims, 3 homes.', 4.99, NULL, 'POPULAR', true, 1, '["/fly in claims","Custom prefix","3 /home"]'::jsonb),
  ((SELECT id FROM public.categories WHERE slug='ranks'), 'Molten Rank', 'molten-rank', 'Includes Ember + colored chat, 6 homes, kit weekly.', 9.99, 7.99, 'SALE', true, 2, '["All Ember perks","Colored chat","6 /home","Weekly kit"]'::jsonb),
  ((SELECT id FROM public.categories WHERE slug='ranks'), 'Inferno Rank', 'inferno-rank', 'Top rank. 10 homes, /nick, particle trail.', 19.99, NULL, 'BEST VALUE', true, 3, '["All Molten perks","/nick","Particle trail","10 /home"]'::jsonb),
  ((SELECT id FROM public.categories WHERE slug='keys'), 'Blaze Key x5', 'blaze-key-5', '5 Blaze crate keys.', 3.99, NULL, NULL, false, 4, '[]'::jsonb),
  ((SELECT id FROM public.categories WHERE slug='cosmetics'), 'Ember Wings', 'ember-wings', 'Cosmetic wings visual.', 2.49, NULL, 'NEW', false, 5, '[]'::jsonb);

INSERT INTO public.staff(name, role, minecraft_username, sort_order) VALUES
  ('Rishu','Owner','Rishu',1),
  ('Cinder','Admin','Cinder_MC',2),
  ('Ashes','Moderator','Ashes',3);

-- Realtime for live-updating public content
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.faq;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
