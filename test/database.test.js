const assert = require('node:assert/strict');
const { test } = require('node:test');
const { openDatabase } = require('../backend/src/db/connection');

test('abre e consulta um banco SQLite em memória', () => {
  const database = openDatabase(':memory:');

  try {
    const row = database.prepare('SELECT 1 AS value').get();
    assert.equal(row.value, 1);
  } finally {
    database.close();
  }
});
