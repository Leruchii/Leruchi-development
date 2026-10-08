INSERT INTO auth.users
  (id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated',
   'stage03-tenant-a@example.test', crypt('Stage03-Password-24!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"active_tenant_id":"tenant_a"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated',
   'stage03-tenant-b@example.test', crypt('Stage03-Password-24!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"active_tenant_id":"tenant_b"}'::jsonb, now(), now())
ON CONFLICT (id) DO UPDATE
  SET encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = EXCLUDED.email_confirmed_at,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data,
      updated_at = now();

INSERT INTO vibe_auth.user_tenant_memberships
  (user_id, tenant_id, membership_status, is_default)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'tenant_a', 'active', true),
  ('00000000-0000-0000-0000-000000000101', 'tenant_b', 'revoked', false),
  ('00000000-0000-0000-0000-000000000102', 'tenant_a', 'active', true),
  ('00000000-0000-0000-0000-000000000102', 'tenant_b', 'revoked', false)
ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET membership_status = EXCLUDED.membership_status,
      is_default = EXCLUDED.is_default;
