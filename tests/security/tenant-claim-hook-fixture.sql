INSERT INTO vibe_auth.user_tenant_memberships
  (user_id, tenant_id, membership_status, is_default)
VALUES
  (:'user_a'::uuid, 'tenant_a', 'active', true),
  (:'user_a'::uuid, 'tenant_b', 'revoked', false),
  (:'user_b'::uuid, 'tenant_a', 'active', true),
  (:'user_b'::uuid, 'tenant_b', 'revoked', false)
ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET membership_status = EXCLUDED.membership_status,
      is_default = EXCLUDED.is_default;
