-- RF01, RNF05, RNF06: payload server-side com expiração por inatividade.
ALTER TABLE sessions
  ADD COLUMN session_data TEXT NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON sessions(expires_at);

-- RNF16: eventos autenticados ou pré-autenticados têm exatamente um ator.
DROP TRIGGER IF EXISTS prevent_audit_log_update;
DROP TRIGGER IF EXISTS prevent_audit_log_delete;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_created_at;

ALTER TABLE audit_logs RENAME TO audit_logs_v1;

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  actor_identity TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  reason TEXT,
  previous_value TEXT,
  new_value TEXT,
  details TEXT,
  created_at TEXT NOT NULL,
  CHECK (
    (actor_user_id IS NOT NULL AND actor_identity IS NULL)
    OR (
      actor_user_id IS NULL
      AND actor_identity IS NOT NULL
      AND length(trim(actor_identity)) > 0
    )
  )
);

INSERT INTO audit_logs (
  id, actor_user_id, actor_identity, actor_role, action, target_type,
  target_id, reason, previous_value, new_value, details, created_at
)
SELECT
  id, actor_user_id, NULL, actor_role, action, target_type,
  target_id, reason, previous_value, new_value, details, created_at
FROM audit_logs_v1;

DROP TABLE audit_logs_v1;

CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE TRIGGER prevent_audit_log_update
BEFORE UPDATE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'Registros de auditoria não podem ser alterados.');
END;

CREATE TRIGGER prevent_audit_log_delete
BEFORE DELETE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'Registros de auditoria não podem ser excluídos.');
END;
