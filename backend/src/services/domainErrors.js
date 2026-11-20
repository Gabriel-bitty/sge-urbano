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

module.exports = {
  NotFoundError,
  ValidationError,
};
