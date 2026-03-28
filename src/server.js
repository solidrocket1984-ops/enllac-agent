const { env, validateEnvOrThrow } = require('./config/env');
const { createApp } = require('./app');

validateEnvOrThrow(env);

const app = createApp({ env });

app.listen(env.PORT, () => {
  console.log(`${env.APP_NAME} listening on port ${env.PORT}`);
});
