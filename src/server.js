const { createApp } = require('./app');
const { loadEnv } = require('./config/env');

function startServer() {
  const env = loadEnv();
  const app = createApp({ env });
  return app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`${env.APP_NAME} listening on ${env.PORT}`);
  });
}

module.exports = { startServer };
