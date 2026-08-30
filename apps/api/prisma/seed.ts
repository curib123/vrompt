import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const officialCategories = [
  'Coding',
  'Design',
  'Writing',
  'Business',
  'Marketing',
  'Education',
  'Research',
  'Productivity',
  'Data Analysis',
  'Image Generation',
  'Career',
  'Entertainment',
  'Other',
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  for (const name of officialCategories) {
    await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: { name },
      create: { name, slug: slugify(name) },
    });
  }

  console.log(
    `Seeded ${officialCategories.length} official Vrompt categories.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
