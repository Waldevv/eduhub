import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const teacher = await prisma.usuario.upsert({
    where: { email: 'professor@eduhub.dev' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Professor Padrão',
      email: 'professor@eduhub.dev',
      password_hash: 'placeholder',
      role: 'teacher',
    },
  });
  console.log('Seed ok — teacher id:', teacher.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
