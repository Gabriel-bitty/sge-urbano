const createApp = require('./app');
const { openDatabase } = require('./db/connection');
const { seedDatabase } = require('./db/seed');

const port = Number(process.env.PORT || 3000);
const database = openDatabase();
const app = createApp({ database });

if (process.env.NODE_ENV === 'test') {
  seedDatabase(database);
}

app.listen(port, () => {
  console.log(`SGE-Urbano disponível em http://localhost:${port}`);
});
