const ts = () => new Date().toISOString();

export const logger = {
  info: (msg, ...args) => console.log(`[${ts()}] INFO  ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[${ts()}] WARN  \x1b[33m${msg}\x1b[0m`, ...args),
  error: (msg, ...args) => console.error(`[${ts()}] ERROR \x1b[31m${msg}\x1b[0m`, ...args)
};
