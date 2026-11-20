class ValidationError extends Error {
  constructor(fields) {
    super('Um ou mais campos são inválidos.');
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

class NotFoundError extends Error {
  constructor(resource) {
    super(`${resource} não encontrado.`);
    this.name = 'NotFoundError';
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Acesso negado para esta operação.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

module.exports = {
  ForbiddenError,
  NotFoundError,
  ValidationError,
};
