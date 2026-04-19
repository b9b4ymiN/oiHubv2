// ecosystem.config.cjs — pm2 process config for signal daemon
//
// Usage:
//   pm2 start ecosystem.config.cjs
//   pm2 logs signal-daemon
//   pm2 stop signal-daemon
//   pm2 restart signal-daemon

module.exports = {
  apps: [{
    name: 'signal-daemon',
    script: 'npx',
    args: 'tsx scripts/run-signal-daemon.ts',
    cwd: '/home/opc/oiHubv2',
    env: {
      NODE_ENV: 'production',
      DISCORD_SIGNAL_WEBHOOK_URL: process.env.DISCORD_SIGNAL_WEBHOOK_URL || '',
      DAILY_SUMMARY_HOUR: '0',
      BAR_HISTORY_LENGTH: '100',
      INITIAL_CAPITAL: '10000',
    },
    // Restart policy
    max_restarts: 10,
    restart_delay: 30000,
    autorestart: true,
    max_memory_restart: '512M',
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/signal-daemon-error.log',
    out_file: 'logs/signal-daemon-out.log',
    merge_logs: true,
  }],
}
