/**
 * Postgres-backed durable grant store. The caller supplies a configured pg Pool.
 * Apply schema.sql with a migration role before starting the service.
 */
export function createPostgresCapabilityStore(pool) {
  if (!pool || typeof pool.query !== "function") throw new Error("A configured PostgreSQL pool is required");
  return Object.freeze({
    async createGrant({ jti, subject, tenantId, issuedAt, expiresAt, grant }) {
      await pool.query(
        "INSERT INTO capability_control.grants (jti, subject, tenant_id, issued_at, expires_at, grant_claims) VALUES ($1,$2,$3,to_timestamp($4),to_timestamp($5),$6::jsonb)",
        [jti, subject, tenantId, issuedAt, expiresAt, JSON.stringify(grant)],
      );
    },
    async getGrant(jti) {
      const result = await pool.query(
        "SELECT jti, extract(epoch FROM expires_at)::bigint AS expires_at, extract(epoch FROM revoked_at)::bigint AS revoked_at FROM capability_control.grants WHERE jti = $1",
        [jti],
      );
      const row = result.rows[0];
      return row ? { jti: row.jti, expiresAt: Number(row.expires_at), revokedAt: row.revoked_at === null ? null : Number(row.revoked_at) } : null;
    },
    async revokeGrant(jti, revokedAt) {
      const result = await pool.query(
        "UPDATE capability_control.grants SET revoked_at = COALESCE(revoked_at, to_timestamp($2)) WHERE jti = $1 RETURNING jti",
        [jti, revokedAt],
      );
      return result.rowCount > 0;
    },
  });
}
