const chalk = require('chalk');
const app = require('./src/app');
const env = require('./src/config/env');
const { testConnection } = require('./src/config/db');
const { printRoutes } = require('./src/utils/routeLogger');

const startServer = async () => {
  console.log(chalk.cyan.bold('\n🚀 Starting API...\n'));

  try {
    console.log(chalk.yellow('🔄 Checking database connection...'));
    await testConnection();
    console.log(chalk.green('✅ Database connected successfully'));

    app.listen(env.port, () => {
      console.log('\n' + '='.repeat(60));
      console.log(chalk.green.bold('🚀 SERVER STARTED SUCCESSFULLY'));
      console.log('='.repeat(60));

      console.log(
        `${chalk.blue('🌐 Environment :')} ${chalk.white(env.nodeEnv)}`
      );
      console.log(
        `${chalk.blue('📡 Port        :')} ${chalk.white(env.port)}`
      );
      console.log(
        `${chalk.blue('🕒 Started At  :')} ${chalk.white(
          new Date().toLocaleString()
        )}`
      );

      console.log(
        `${chalk.blue('🔗 Base URL    :')} ${chalk.white(
          `http://localhost:${env.port}`
        )}`
      );

      console.log('');
      printRoutes(app);

      console.log('='.repeat(60) + '\n');
    });
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.error(chalk.red.bold('❌ SERVER STARTUP FAILED'));
    console.error(
      chalk.red(
        `Error: ${error.message || error.code || JSON.stringify(error)}`
      )
    );

    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }

    console.log('='.repeat(60) + '\n');

    process.exit(1);
  }
};

startServer();
