/** Normaliza erros HTTP com campo/motivo sem vazar falhas internas (RNF09, RNF19). */
const {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} = require('../services/domainErrors');

function errorHandler(error, _req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: error.message,
      fields: error.fields,
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: error.message,
    });
  }

  if (error instanceof ForbiddenError) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: error.message,
    });
  }

  if (error.code === 'ERR_SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'O registro conflita com um dado já cadastrado.',
    });
  }

  if (
    error.code === 'ERR_SQLITE_CONSTRAINT_CHECK'
    || error.code === 'ERR_SQLITE_CONSTRAINT_FOREIGNKEY'
  ) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Os dados enviados violam uma regra de cadastro.',
    });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'INVALID_JSON',
      message: 'O corpo da requisição não contém JSON válido.',
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'PAYLOAD_TOO_LARGE',
      message: 'O corpo da requisição excede o limite permitido.',
    });
  }

  console.error(error);
  return res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Não foi possível concluir a operação.',
  });
}

function notFoundHandler(_req, res) {
  return res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Rota da API não encontrada.',
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
