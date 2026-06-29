/** @type {import('pm2').StartOptions[]} */
module.exports = {
  apps: [
    {
      name: 'reviewboost-api',
      script: 'dist/app.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      max_restarts: 10,
      restart_delay: 4000,
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5000,
      },
    },
  ],
};
