const { verifyPassword } = require('./passwordService');

const DUMMY_PASSWORD_HASH = [
  'scrypt',
  2 ** 17,
  8,
  1,
  Buffer.alloc(16).toString('base64url'),
  Buffer.alloc(64).toString('base64url'),
].join('$');

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    status: user.status,
  };
}

function createAuthService({ userRepository, auditService }) {
  if (!userRepository || !auditService) {
    throw new TypeError('Repositório de usuários e serviço de auditoria são obrigatórios.');
  }

  async function login(username, password) {
    const loginName = typeof username === 'string' ? username.trim() : '';
    const user = loginName ? userRepository.findByUsername(loginName) : null;
    const passwordMatches = await verifyPassword(
      typeof password === 'string' ? password : '',
      user ? user.password_hash : DUMMY_PASSWORD_HASH
    );
    const isActive = Boolean(user && user.status === 'Ativo' && passwordMatches);

    if (!isActive) {
      auditService.record({
        actorIdentity: loginName || 'login:sem-identificador',
        action: 'auth.login.failed',
        targetType: 'user',
        targetId: user ? String(user.id) : null,
        reason: user && user.status !== 'Ativo'
          ? 'usuario_inativo'
          : 'credenciais_invalidas',
      });
      return null;
    }

    return toPublicUser(user);
  }

  return { login };
}

module.exports = { createAuthService };
