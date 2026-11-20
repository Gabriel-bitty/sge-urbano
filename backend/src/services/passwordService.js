const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = Object.freeze({
  N: 2 ** 17,
  r: 8,
  p: 1,
  maxmem: 256 * 1024 * 1024,
});

function assertPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new TypeError('A senha deve ser uma string não vazia.');
  }
}

function encodeHash(salt, derivedKey) {
  return [
    'scrypt',
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

function parseHash(encodedHash) {
  if (typeof encodedHash !== 'string') {
    return null;
  }

  const [algorithm, cost, blockSize, parallelization, saltText, keyText, extra] =
    encodedHash.split('$');

  if (
    algorithm !== 'scrypt'
    || Number(cost) !== SCRYPT_OPTIONS.N
    || Number(blockSize) !== SCRYPT_OPTIONS.r
    || Number(parallelization) !== SCRYPT_OPTIONS.p
    || !saltText
    || !keyText
    || extra !== undefined
  ) {
    return null;
  }

  const salt = Buffer.from(saltText, 'base64url');
  const expectedKey = Buffer.from(keyText, 'base64url');

  if (
    salt.length !== SALT_LENGTH
    || expectedKey.length !== KEY_LENGTH
    || salt.toString('base64url') !== saltText
    || expectedKey.toString('base64url') !== keyText
  ) {
    return null;
  }

  return { salt, expectedKey };
}

async function hashPassword(password) {
  assertPassword(password);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = await scrypt(
    Buffer.from(password, 'utf8'),
    salt,
    KEY_LENGTH,
    SCRYPT_OPTIONS
  );
  return encodeHash(salt, derivedKey);
}

function hashPasswordSync(password) {
  assertPassword(password);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = crypto.scryptSync(
    Buffer.from(password, 'utf8'),
    salt,
    KEY_LENGTH,
    SCRYPT_OPTIONS
  );
  return encodeHash(salt, derivedKey);
}

async function verifyPassword(password, encodedHash) {
  if (typeof password !== 'string') {
    return false;
  }

  const parsedHash = parseHash(encodedHash);

  if (!parsedHash) {
    return false;
  }

  const derivedKey = await scrypt(
    Buffer.from(password, 'utf8'),
    parsedHash.salt,
    KEY_LENGTH,
    SCRYPT_OPTIONS
  );

  return crypto.timingSafeEqual(derivedKey, parsedHash.expectedKey);
}

module.exports = {
  hashPassword,
  hashPasswordSync,
  verifyPassword,
};
