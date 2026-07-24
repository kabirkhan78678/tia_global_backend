const chalk = require('chalk');
const http = require('http');
const os = require('os');

const app = require('./src/app');
const env = require('./src/config/env');
const { testConnection } = require('./src/config/db');
const { printRoutes } = require('./src/utils/routeLogger');
const initializeSocket = require('./src/socket');

// Get Local IP Address
const getLocalIp = () => {
  const interfaces = os.networkInterfaces();

  for (const interfaceName of Object.keys(interfaces)) {
    for (const iface of interfaces[interfaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return '127.0.0.1';
};

const startServer = async () => {
  console.log(chalk.cyan.bold('\n🚀 Starting API...\n'));

  try {
    console.log(chalk.yellow('🔄 Checking database connection...'));
    await testConnection();
    console.log(chalk.green('✅ Database connected successfully'));

    const httpServer = http.createServer(app);
    initializeSocket(httpServer);

    httpServer.listen(env.port, '0.0.0.0', () => {
      const localIp = getLocalIp();

      console.log('\n' + '='.repeat(70));
      console.log(chalk.green.bold('🚀 SERVER STARTED SUCCESSFULLY'));
      console.log('='.repeat(70));

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

      console.log('');
      console.log(chalk.green.bold('📍 Server URLs'));
      console.log(
        `${chalk.blue('🏠 Localhost   :')} ${chalk.white(
          `http://localhost:${env.port}`
        )}`
      );
      console.log(
        `${chalk.blue('🌐 Local IP    :')} ${chalk.white(
          `http://${localIp}:${env.port}`
        )}`
      );

      console.log('');
      printRoutes(app);

      console.log('='.repeat(70) + '\n');
    });
  } catch (error) {
    console.log('\n' + '='.repeat(70));
    console.error(chalk.red.bold('❌ SERVER STARTUP FAILED'));
    console.error(
      chalk.red(
        `Error: ${error.message || error.code || JSON.stringify(error)}`
      )
    );

    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }

    console.log('='.repeat(70) + '\n');

    process.exit(1);
  }
};

startServer();