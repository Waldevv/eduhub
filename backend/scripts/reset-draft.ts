import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Busca todas as unidades com seus blocos e canais vinculados
  const units = await prisma.unidade.findMany({
    include: {
      blocks: {
        include: {
          interaction: true,
          consolidation: true,
        },
      },
      announcement_channels: true,
    },
  });

  for (const unit of units) {
    const blockIds = unit.blocks.map(b => b.id);

    // 2. Coleta os IDs de CanalDiscord referenciados pelos blocos
    const channelIdsFromBlocks: string[] = [];
    for (const block of unit.blocks) {
      if (block.interaction?.channel_id) channelIdsFromBlocks.push(block.interaction.channel_id);
      if (block.consolidation?.channel_id) channelIdsFromBlocks.push(block.consolidation.channel_id);
    }

    // 3. Nulifica channel_id em BlocoInteracao e BlocoConsolidacao
    if (blockIds.length > 0) {
      await prisma.blocoInteracao.updateMany({
        where: { block_id: { in: blockIds } },
        data: { channel_id: null },
      });
      await prisma.blocoConsolidacao.updateMany({
        where: { block_id: { in: blockIds } },
        data: { channel_id: null },
      });
    }

    // 4. Deleta CanalDiscord dos blocos de interação/consolidação
    if (channelIdsFromBlocks.length > 0) {
      await prisma.canalDiscord.deleteMany({
        where: { id: { in: channelIdsFromBlocks } },
      });
    }

    // 5. Deleta CanalDiscord de anúncio vinculados à unidade
    if (unit.announcement_channels.length > 0) {
      await prisma.canalDiscord.deleteMany({
        where: { unit_id: unit.id },
      });
    }

    // 6. Reverte a unidade para draft e limpa o category_id do Discord
    await prisma.unidade.update({
      where: { id: unit.id },
      data: {
        status: 'draft',
        is_published: false,
        discord_category_id: null,
      },
    });
  }

  console.log(`✓ ${units.length} aula(s) revertida(s) para draft com canais Discord limpos.`);
}

main()
  .catch(e => { console.error('Erro:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
