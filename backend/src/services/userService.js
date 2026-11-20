/** Fornece Técnicos ativos para atribuição de OS (RF10, RN11, CT10). */
const { ValidationError } = require('./domainErrors');

function createUserService({ userRepository }) {
  if (!userRepository || typeof userRepository.list !== 'function') {
    throw new TypeError('Repositório de usuários válido é obrigatório.');
  }

  function list(query = {}) {
    if (Object.keys(query).length > 0) {
      const fields = {};
      for (const key of Object.keys(query)) {
        fields[key] = 'Filtro não permitido.';
      }
      throw new ValidationError(fields);
    }

    return userRepository.list({
      role: 'Técnico',
      status: 'Ativo',
    });
  }

  return { list };
}

module.exports = { createUserService };
