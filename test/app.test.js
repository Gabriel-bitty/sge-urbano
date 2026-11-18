const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const createApp = require('../backend/src/app');

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('serve a página inicial e o aviso sobre dados simulados', async () => {
  const response = await fetch(baseUrl);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /SGE-Urbano/);
  assert.match(html, /dados de consumo apresentados pelo sistema são simulados/i);
});
