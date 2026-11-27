/** Acesso parametrizado aos parâmetros de anomalia (RF06, RNF13, CT06). */
const { requireDatabase } = require('./repositoryUtils');

function createParametrosRepository(database) {
  const db = requireDatabase(database);

  function list() {
    return db.prepare(`
      SELECT name, value
      FROM anomaly_parameters
      ORDER BY name
    `).all();
  }

  function findByName(name) {
    return db.prepare(`
      SELECT name, value
      FROM anomaly_parameters
      WHERE name = ?
    `).get(name);
  }

  function listAsObject() {
    return Object.fromEntries(
      list().map(({ name, value }) => [name, value])
    );
  }

  function update(name, value) {
    const result = db.prepare(`
      UPDATE anomaly_parameters
      SET value = ?
      WHERE name = ?
    `).run(value, name);

    if (result.changes === 0) {
      throw new Error(`Parâmetro de anomalia "${name}" não encontrado.`);
    }

    return findByName(name);
  }

  return { findByName, list, listAsObject, update };
}

module.exports = { createParametrosRepository };
