import * as migration_20261024_225410_initial from './20261024_225410_initial';

export const migrations = [
  {
    up: migration_20261024_225410_initial.up,
    down: migration_20261024_225410_initial.down,
    name: '20261024_225410_initial'
  },
];
