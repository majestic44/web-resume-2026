export function getDataSource() {
  return process.env.DATA_SOURCE === 'database' ? 'database' : 'seed';
}

export function isDatabaseEnabled() {
  return getDataSource() === 'database';
}

