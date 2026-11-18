const createApp = require('./app');

const port = Number(process.env.PORT || 3000);
const app = createApp();

app.listen(port, () => {
  console.log(`SGE-Urbano disponível em http://localhost:${port}`);
});
