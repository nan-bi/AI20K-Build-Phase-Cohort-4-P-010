import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database via Prisma...');
  const buildingsCount = await prisma.building.count();
  const unitsCount = await prisma.unit.count();
  const mediaCount = await prisma.unitMedia.count();
  const profilesCount = await prisma.profile.count();
  const rolesCount = await prisma.role.count();

  console.log(`Buildings: ${buildingsCount}`);
  console.log(`Units: ${unitsCount}`);
  console.log(`Unit Media: ${mediaCount}`);
  console.log(`Profiles: ${profilesCount}`);
  console.log(`Roles: ${rolesCount}`);

  const units = await prisma.unit.findMany({
    take: 5,
    include: { building: true, media: true },
  });
  console.log('\nSample Units in DB:');
  console.log(JSON.stringify(units, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
