/** Destino substituível de logs técnicos estruturados (RNF03, CT04). */
function createLogRepository({ write } = {}) {
  const sink = write ?? ((entry) => {
    process.stderr.write(`${JSON.stringify(entry)}\n`);
  });

  if (typeof sink !== 'function') {
    throw new TypeError('O destino de escrita de log deve ser uma função.');
  }

  function append(entry) {
    sink(entry);
    return entry;
  }

  return { append };
}

module.exports = { createLogRepository };
