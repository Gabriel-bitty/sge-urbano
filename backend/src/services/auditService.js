function createAuditService(auditRepository, clock = () => new Date()) {
  if (!auditRepository || typeof auditRepository.create !== 'function') {
    throw new TypeError('Um repositório de auditoria válido é obrigatório.');
  }

  function record(event) {
    return auditRepository.create({
      ...event,
      createdAt: clock().toISOString(),
    });
  }

  function list(filters) {
    return auditRepository.list(filters);
  }

  return { list, record };
}

module.exports = { createAuditService };
