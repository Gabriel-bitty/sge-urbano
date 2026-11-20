/** Persistência parametrizada de usuários autenticáveis (RF01, RN01, RNF04). */
const {
  appendFilter,
  insertAndSelect,
  requireDatabase,
  updateById,
  whereClause,
} = require('./repositoryUtils');

function createUsuarioRepository(database) {
  const db = requireDatabase(database);

  function create(user) {
    return insertAndSelect(db, 'users', `
      INSERT INTO users (
        name, username, password_hash, role, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      user.name,
      user.username,
      user.passwordHash,
      user.role,
      user.status ?? 'Ativo',
      user.createdAt,
      user.updatedAt ?? user.createdAt,
    ]);
  }

  function findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  function findByUsername(username) {
    return db.prepare(
      'SELECT * FROM users WHERE username = ?'
    ).get(username);
  }

  function list(filters = {}) {
    const clauses = [];
    const parameters = [];
    appendFilter(clauses, parameters, 'role = ?', filters.role);
    appendFilter(clauses, parameters, 'status = ?', filters.status);

    return db.prepare(`
      SELECT id, name, username, role, status, created_at, updated_at
      FROM users
      ${whereClause(clauses)}
      ORDER BY name, id
    `).all(...parameters);
  }

  function update(id, values) {
    return updateById(db, 'users', {
      name: 'name',
      username: 'username',
      passwordHash: 'password_hash',
      role: 'role',
      status: 'status',
      updatedAt: 'updated_at',
    }, id, values);
  }

  return { create, findById, findByUsername, list, update };
}

module.exports = { createUsuarioRepository };
