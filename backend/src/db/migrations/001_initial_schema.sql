PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS anomaly_parameters (
  name TEXT PRIMARY KEY,
  value REAL NOT NULL CHECK (value >= 0),
  CHECK (
    name IN (
      'LIM_SUP',
      'LIM_INF',
      'TOL_ZERO',
      'FAIXA_BAIXA',
      'FAIXA_MEDIA',
      'FAIXA_ALTA'
    )
  )
);

INSERT OR IGNORE INTO anomaly_parameters (name, value) VALUES
  ('LIM_SUP', 10),
  ('LIM_INF', 10),
  ('TOL_ZERO', 0.5),
  ('FAIXA_BAIXA', 10),
  ('FAIXA_MEDIA', 20),
  ('FAIXA_ALTA', 50);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) >= 2),
  username TEXT NOT NULL UNIQUE CHECK (length(trim(username)) >= 3),
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Gestor', 'Técnico')),
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) >= 2),
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  status TEXT NOT NULL DEFAULT 'Ativo'
    CHECK (status IN ('Ativo', 'Inativo', 'Bloqueado')),
  previous_status TEXT
    CHECK (previous_status IS NULL OR previous_status IN ('Ativo', 'Inativo')),
  block_reason TEXT
    CHECK (block_reason IS NULL OR length(trim(block_reason)) >= 10),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS equipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('poste', 'predio_municipal')),
  location TEXT NOT NULL
    CHECK (length(trim(location)) >= 3 AND length(trim(location)) <= 200),
  expected_consumption_kwh REAL NOT NULL
    CHECK (expected_consumption_kwh > 0),
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  status TEXT NOT NULL DEFAULT 'Ativo'
    CHECK (status IN ('Ativo', 'Inativo', 'Bloqueado')),
  previous_status TEXT
    CHECK (previous_status IS NULL OR previous_status IN ('Ativo', 'Inativo')),
  block_reason TEXT
    CHECK (block_reason IS NULL OR length(trim(block_reason)) >= 10),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_equipments_region_id ON equipments(region_id);
CREATE INDEX IF NOT EXISTS idx_equipments_status ON equipments(status);

CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL REFERENCES equipments(id) ON DELETE RESTRICT,
  batch_id TEXT,
  scenario TEXT NOT NULL CHECK (scenario IN ('normal', 'pico', 'falha')),
  measured_consumption_kwh REAL NOT NULL
    CHECK (measured_consumption_kwh >= 0),
  expected_consumption_kwh REAL NOT NULL
    CHECK (expected_consumption_kwh > 0),
  deviation_percent REAL NOT NULL,
  is_anomaly INTEGER NOT NULL DEFAULT 0 CHECK (is_anomaly IN (0, 1)),
  anomaly_type TEXT
    CHECK (
      anomaly_type IS NULL
      OR anomaly_type IN ('falha_total', 'consumo_acima', 'consumo_abaixo')
    ),
  severity TEXT
    CHECK (severity IS NULL OR severity IN ('Baixa', 'Média', 'Alta')),
  unit TEXT NOT NULL DEFAULT 'kWh' CHECK (unit = 'kWh'),
  origin TEXT NOT NULL DEFAULT 'SIMULADO' CHECK (origin = 'SIMULADO'),
  recorded_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_readings_equipment_id
  ON readings(equipment_id);
CREATE INDEX IF NOT EXISTS idx_readings_recorded_at
  ON readings(recorded_at);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL REFERENCES equipments(id) ON DELETE RESTRICT,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  last_reading_id INTEGER NOT NULL
    REFERENCES readings(id) ON DELETE RESTRICT,
  anomaly_type TEXT NOT NULL
    CHECK (
      anomaly_type IN ('falha_total', 'consumo_acima', 'consumo_abaixo')
    ),
  severity TEXT NOT NULL CHECK (severity IN ('Baixa', 'Média', 'Alta')),
  measured_consumption_kwh REAL NOT NULL,
  expected_consumption_kwh REAL NOT NULL CHECK (expected_consumption_kwh > 0),
  deviation_percent REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Ativo'
    CHECK (status IN ('Ativo', 'Suspenso', 'Resolvido')),
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count >= 1),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_active_equipment_type
  ON alerts(equipment_id, anomaly_type)
  WHERE status IN ('Ativo', 'Suspenso');

CREATE INDEX IF NOT EXISTS idx_alerts_filters
  ON alerts(status, severity, region_id, equipment_id);

CREATE TABLE IF NOT EXISTS occurrences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  protocol TEXT NOT NULL UNIQUE CHECK (length(trim(protocol)) >= 10),
  citizen_name TEXT NOT NULL CHECK (length(trim(citizen_name)) >= 2),
  citizen_email TEXT NOT NULL,
  citizen_phone TEXT,
  citizen_cpf_simulated TEXT,
  type TEXT NOT NULL CHECK (
    type IN (
      'poste apagado',
      'oscilação de energia',
      'falta de energia',
      'prédio público com consumo anormal',
      'iluminação acesa durante o dia'
    )
  ),
  description TEXT NOT NULL CHECK (length(trim(description)) >= 3),
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  equipment_id INTEGER REFERENCES equipments(id) ON DELETE RESTRICT,
  address_reference TEXT NOT NULL
    CHECK (length(trim(address_reference)) >= 3),
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  status TEXT NOT NULL DEFAULT 'Aberta' CHECK (
    status IN (
      'Aberta',
      'Atribuída',
      'Em atendimento',
      'Concluída',
      'Cancelada'
    )
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (citizen_phone IS NOT NULL AND length(trim(citizen_phone)) >= 8)
    OR (
      citizen_cpf_simulated IS NOT NULL
      AND length(trim(citizen_cpf_simulated)) >= 11
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_occurrences_protocol
  ON occurrences(protocol);
CREATE INDEX IF NOT EXISTS idx_occurrences_region_id
  ON occurrences(region_id);

CREATE TABLE IF NOT EXISTS work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  origin TEXT NOT NULL CHECK (origin IN ('alerta', 'cidadao', 'manual')),
  alert_id INTEGER REFERENCES alerts(id) ON DELETE RESTRICT,
  occurrence_id INTEGER REFERENCES occurrences(id) ON DELETE RESTRICT,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  equipment_id INTEGER REFERENCES equipments(id) ON DELETE RESTRICT,
  location TEXT NOT NULL CHECK (length(trim(location)) > 0),
  description TEXT NOT NULL CHECK (length(trim(description)) >= 3),
  status TEXT NOT NULL DEFAULT 'Aberta' CHECK (
    status IN (
      'Aberta',
      'Atribuída',
      'Em atendimento',
      'Concluída',
      'Cancelada'
    )
  ),
  assigned_technician_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  created_by_user_id INTEGER NOT NULL
    REFERENCES users(id) ON DELETE RESTRICT,
  solution_description TEXT,
  cancellation_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    status != 'Concluída'
    OR length(trim(COALESCE(solution_description, ''))) > 0
  ),
  CHECK (
    status != 'Cancelada'
    OR length(trim(COALESCE(cancellation_reason, ''))) > 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_work_orders_active_alert
  ON work_orders(alert_id)
  WHERE alert_id IS NOT NULL
    AND status IN ('Aberta', 'Atribuída', 'Em atendimento');

CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician
  ON work_orders(assigned_technician_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  reason TEXT,
  previous_value TEXT,
  new_value TEXT,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at);

CREATE TRIGGER IF NOT EXISTS prevent_audit_log_update
BEFORE UPDATE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'Registros de auditoria não podem ser alterados.');
END;

CREATE TRIGGER IF NOT EXISTS prevent_audit_log_delete
BEFORE DELETE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'Registros de auditoria não podem ser excluídos.');
END;

CREATE TRIGGER IF NOT EXISTS prevent_alert_delete
BEFORE DELETE ON alerts
BEGIN
  SELECT RAISE(ABORT, 'Alertas não podem ser excluídos fisicamente.');
END;

CREATE TRIGGER IF NOT EXISTS prevent_occurrence_delete
BEFORE DELETE ON occurrences
BEGIN
  SELECT RAISE(ABORT, 'Ocorrências não podem ser excluídas fisicamente.');
END;

CREATE TRIGGER IF NOT EXISTS prevent_work_order_delete
BEFORE DELETE ON work_orders
BEGIN
  SELECT RAISE(ABORT, 'Ordens de serviço não podem ser excluídas fisicamente.');
END;
