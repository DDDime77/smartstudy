module.exports = {
  apps: [
    {
      name: 'smartstudy-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/home/claudeuser/smartstudy',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      error_file: '/home/claudeuser/smartstudy/logs/frontend-error.log',
      out_file: '/home/claudeuser/smartstudy/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};
