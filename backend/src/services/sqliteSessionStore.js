const session = require('express-session');

const SESSION_COOKIE_NAME = 'sge.sid';
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

function getExpiry(sessionData, now) {
  const cookieExpiry = sessionData.cookie && sessionData.cookie.expires;
  const expiryTime = cookieExpiry
    ? new Date(cookieExpiry).getTime()
    : now.getTime() + SESSION_IDLE_TIMEOUT_MS;

  if (!Number.isFinite(expiryTime)) {
    throw new TypeError('A data de expiração da sessão é inválida.');
  }

  return new Date(expiryTime).toISOString();
}

class SQLiteSessionStore extends session.Store {
  constructor(database) {
    super();

    if (!database || typeof database.prepare !== 'function') {
      throw new TypeError('Uma conexão SQLite válida é obrigatória para as sessões.');
    }

    this.database = database;
  }

  get(sessionId, callback) {
    try {
      const now = new Date().toISOString();
      const row = this.database.prepare(`
        SELECT session_data
        FROM sessions
        WHERE id = ? AND revoked_at IS NULL AND expires_at > ?
      `).get(sessionId, now);

      callback(null, row ? JSON.parse(row.session_data) : null);
    } catch (error) {
      callback(error);
    }
  }

  set(sessionId, sessionData, callback) {
    try {
      const userId = sessionData.userId;
      if (!Number.isSafeInteger(userId) || userId < 1) {
        throw new TypeError('A sessão persistida deve pertencer a um usuário autenticado.');
      }

      const now = new Date();
      this.database.prepare(`
        INSERT INTO sessions (
          id, user_id, session_data, created_at, last_activity_at, expires_at,
          revoked_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL)
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          session_data = excluded.session_data,
          last_activity_at = excluded.last_activity_at,
          expires_at = excluded.expires_at,
          revoked_at = NULL
      `).run(
        sessionId,
        userId,
        JSON.stringify(sessionData),
        now.toISOString(),
        now.toISOString(),
        getExpiry(sessionData, now)
      );

      callback();
    } catch (error) {
      callback(error);
    }
  }

  touch(sessionId, sessionData, callback) {
    try {
      const now = new Date();
      this.database.prepare(`
        UPDATE sessions
        SET session_data = ?, last_activity_at = ?, expires_at = ?
        WHERE id = ? AND user_id = ? AND revoked_at IS NULL
      `).run(
        JSON.stringify(sessionData),
        now.toISOString(),
        getExpiry(sessionData, now),
        sessionId,
        sessionData.userId
      );

      callback();
    } catch (error) {
      callback(error);
    }
  }

  destroy(sessionId, callback) {
    try {
      this.database.prepare(`
        UPDATE sessions
        SET revoked_at = ?
        WHERE id = ? AND revoked_at IS NULL
      `).run(new Date().toISOString(), sessionId);

      callback();
    } catch (error) {
      callback(error);
    }
  }
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_IDLE_TIMEOUT_MS,
  SQLiteSessionStore,
};
