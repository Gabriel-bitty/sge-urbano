/** Utilitários parametrizados compartilhados pelos repositórios (RNF18, RNF19). */
function requireDatabase(database) {
  if (!database || typeof database.prepare !== 'function') {
    throw new TypeError('Uma conexão SQLite válida é obrigatória.');
  }

  return database;
}

function selectInsertedRow(database, table, id) {
  return database.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

function insertAndSelect(database, table, sql, values) {
  const result = database.prepare(sql).run(...values);
  return selectInsertedRow(database, table, result.lastInsertRowid);
}

function updateById(database, table, columns, id, values) {
  const assignments = [];
  const parameters = [];

  for (const [inputName, columnName] of Object.entries(columns)) {
    if (values[inputName] !== undefined) {
      assignments.push(`${columnName} = ?`);
      parameters.push(values[inputName]);
    }
  }

  if (assignments.length === 0) {
    throw new TypeError('Informe ao menos um campo para atualização.');
  }

  const result = database.prepare(`
    UPDATE ${table}
    SET ${assignments.join(', ')}
    WHERE id = ?
  `).run(...parameters, id);

  if (result.changes === 0) {
    throw new Error(`Registro ${id} não encontrado em ${table}.`);
  }

  return selectInsertedRow(database, table, id);
}

function appendFilter(clauses, parameters, condition, value) {
  if (value !== undefined && value !== null) {
    clauses.push(condition);
    parameters.push(value);
  }
}

function whereClause(clauses) {
  return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
}

module.exports = {
  appendFilter,
  insertAndSelect,
  requireDatabase,
  selectInsertedRow,
  updateById,
  whereClause,
};
