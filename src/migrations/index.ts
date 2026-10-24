import * as migration_20261024_225410_initial from './20261024_225410_initial';
import * as migration_20261024_232132_lot1_comptes from './20261024_232132_lot1_comptes';

export const migrations = [
  {
    up: migration_20261024_225410_initial.up,
    down: migration_20261024_225410_initial.down,
    name: '20261024_225410_initial',
  },
  {
    up: migration_20261024_232132_lot1_comptes.up,
    down: migration_20261024_232132_lot1_comptes.down,
    name: '20261024_232132_lot1_comptes'
  },
];
