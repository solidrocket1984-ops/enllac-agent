function shouldLog(level, current) {
  const levels = ['debug', 'info', 'warn', 'error'];
  return levels.indexOf(level) >= levels.indexOf(current);
}

function createLogger({ level = 'info', name = 'app' }) {
  function log(logLevel, message, data) {
    if (!shouldLog(logLevel, level)) return;
    const entry = {
      ts: new Date().toISOString(),
      level: logLevel,
      app: name,
      message,
      ...(data || {})
    };
    const out = JSON.stringify(entry);
    if (logLevel === 'error') {
      console.error(out);
    } else {
      console.log(out);
    }
  }

  return {
    debug: (message, data) => log('debug', message, data),
    info: (message, data) => log('info', message, data),
    warn: (message, data) => log('warn', message, data),
    error: (message, data) => log('error', message, data),
    child(extra) {
      return {
        debug: (message, data) => log('debug', message, { ...extra, ...(data || {}) }),
        info: (message, data) => log('info', message, { ...extra, ...(data || {}) }),
        warn: (message, data) => log('warn', message, { ...extra, ...(data || {}) }),
        error: (message, data) => log('error', message, { ...extra, ...(data || {}) })
      };
    }
  };
}

module.exports = { createLogger };
