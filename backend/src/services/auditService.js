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

  return { record };
}

module.exports = { createAuditService };
