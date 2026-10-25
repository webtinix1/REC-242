import * as migration_20261024_225410_initial from './20261024_225410_initial';
import * as migration_20261024_232132_lot1_comptes from './20261024_232132_lot1_comptes';
import * as migration_20261024_233603_lot2_contenus from './20261024_233603_lot2_contenus';
import * as migration_20261025_012157_lot3_site from './20261025_012157_lot3_site';
import * as migration_20261025_020052_lot4_messages from './20261025_020052_lot4_messages';
import * as migration_20261025_030501_lot5_adhesion from './20261025_030501_lot5_adhesion';
import * as migration_20261025_040608_lot6_membres from './20261025_040608_lot6_membres';
import * as migration_20261025_045221_lot7_annuaire from './20261025_045221_lot7_annuaire';
import * as migration_20261025_062052_lot8_evenements from './20261025_062052_lot8_evenements';
import * as migration_20261025_070348_lot9_opportunites from './20261025_070348_lot9_opportunites';
import * as migration_20261025_075814_lot10_echanges from './20261025_075814_lot10_echanges';
import * as migration_20261025_085408_lot11_cotisations from './20261025_085408_lot11_cotisations';

export const migrations = [
  {
    up: migration_20261024_225410_initial.up,
    down: migration_20261024_225410_initial.down,
    name: '20261024_225410_initial',
  },
  {
    up: migration_20261024_232132_lot1_comptes.up,
    down: migration_20261024_232132_lot1_comptes.down,
    name: '20261024_232132_lot1_comptes',
  },
  {
    up: migration_20261024_233603_lot2_contenus.up,
    down: migration_20261024_233603_lot2_contenus.down,
    name: '20261024_233603_lot2_contenus',
  },
  {
    up: migration_20261025_012157_lot3_site.up,
    down: migration_20261025_012157_lot3_site.down,
    name: '20261025_012157_lot3_site',
  },
  {
    up: migration_20261025_020052_lot4_messages.up,
    down: migration_20261025_020052_lot4_messages.down,
    name: '20261025_020052_lot4_messages',
  },
  {
    up: migration_20261025_030501_lot5_adhesion.up,
    down: migration_20261025_030501_lot5_adhesion.down,
    name: '20261025_030501_lot5_adhesion',
  },
  {
    up: migration_20261025_040608_lot6_membres.up,
    down: migration_20261025_040608_lot6_membres.down,
    name: '20261025_040608_lot6_membres',
  },
  {
    up: migration_20261025_045221_lot7_annuaire.up,
    down: migration_20261025_045221_lot7_annuaire.down,
    name: '20261025_045221_lot7_annuaire',
  },
  {
    up: migration_20261025_062052_lot8_evenements.up,
    down: migration_20261025_062052_lot8_evenements.down,
    name: '20261025_062052_lot8_evenements',
  },
  {
    up: migration_20261025_070348_lot9_opportunites.up,
    down: migration_20261025_070348_lot9_opportunites.down,
    name: '20261025_070348_lot9_opportunites',
  },
  {
    up: migration_20261025_075814_lot10_echanges.up,
    down: migration_20261025_075814_lot10_echanges.down,
    name: '20261025_075814_lot10_echanges',
  },
  {
    up: migration_20261025_085408_lot11_cotisations.up,
    down: migration_20261025_085408_lot11_cotisations.down,
    name: '20261025_085408_lot11_cotisations'
  },
];
