import * as fs from 'fs';
import * as path from 'path';
import { UNITS, ZONES, LANDLORDS, HOSTS } from '../../apps/web/src/lib/mock/units';

function exportWebCatalog() {
  const sortedUnits = [...UNITS].sort((a, b) => a.code.localeCompare(b.code));

  const catalog = {
    exportedAt: new Date().toISOString(),
    zones: ZONES,
    landlords: LANDLORDS,
    hosts: HOSTS,
    units: sortedUnits,
  };

  const targetPath = path.resolve(__dirname, '../prisma/web-catalog.json');
  fs.writeFileSync(targetPath, JSON.stringify(catalog, null, 2), 'utf-8');

  console.log(`✅ Exported ${sortedUnits.length} units, ${ZONES.length} zones, ${LANDLORDS.length} landlords, ${HOSTS.length} hosts to ${targetPath}`);
}

exportWebCatalog();
