import { Client, GatewayIntentBits, TextChannel, ChannelType, PermissionFlagsBits, Events, REST, Routes, SlashCommandBuilder, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } from 'discord.js';
import { join } from 'path';
import { readFileSync } from 'fs';
import { prisma } from './prisma';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

let ready = false;

interface InteractionBlockInfo {
  blockId: string;
  interactionType: string;
  minMessages: number;
  scheduledAt: Date | null;
}

const interactionChannelMap = new Map<string, InteractionBlockInfo>();

const messageCountCache = new Map<string, number>();

async function loadInteractionChannels(): Promise<void> {
  try {
    const interBlocks = await prisma.blocoInteracao.findMany({
      where: { channel_id: { not: null } },
      include: {
        channel: true,
        block: { select: { id: true, config_json: true } },
      },
    });

    const consolBlocks = await prisma.blocoConsolidacao.findMany({
      where: { channel_id: { not: null }, consolidation_type: 'guided_stage' },
      include: { channel: true },
    });

    interactionChannelMap.clear();

    for (const inter of interBlocks) {
      if (!inter.channel) continue;
      const config = (inter.block.config_json as Record<string, unknown>) ?? {};
      const minMessages = typeof config.minMessages === 'number' ? config.minMessages : 1;
      interactionChannelMap.set(inter.channel.discord_channel_id, {
        blockId: inter.block_id,
        interactionType: inter.interaction_type,
        minMessages,
        scheduledAt: inter.scheduled_at,
      });
    }

    for (const consol of consolBlocks) {
      if (!consol.channel) continue;
      interactionChannelMap.set(consol.channel.discord_channel_id, {
        blockId: consol.block_id,
        interactionType: 'voice',
        minMessages: 1,
        scheduledAt: consol.scheduled_at,
      });
    }

    console.log(`[bot] Loaded ${interactionChannelMap.size} interaction channel(s)`);
  } catch (err: any) {
    console.error('[bot] Failed to load interaction channels:', err?.message ?? err);
  }
}

export async function syncUnitDiscordAccess(unitId: string, studentId?: string): Promise<void> {
  if (!ready) return;

  try {
    const unit = await prisma.unidade.findUnique({
      where: { id: unitId },
      include: {
        blocks: {
          where: { status: { not: 'disabled' } },
          orderBy: { sequence_order: 'asc' },
          include: { interaction: { include: { channel: true } } },
        },
        course: {
          include: {
            enrollments: {
              where: { status: 'active', ...(studentId ? { student_id: studentId } : {}) },
              include: { student: { select: { id: true, discord_id: true } } },
            },
          },
        },
      },
    });

    if (!unit) return;

    const students = unit.course.enrollments
      .map((e) => e.student)
      .filter((s) => s.discord_id);

    if (students.length === 0) return;

    const hasInteractionChannels = unit.blocks.some(
      (b) => b.block_type === 'interaction' && b.interaction?.channel?.discord_channel_id
    );
    if (!hasInteractionChannels) return;

    for (const student of students) {
      const progressRecords = await prisma.progressoBloco.findMany({
        where: { student_id: student.id, block_id: { in: unit.blocks.map((b) => b.id) } },
        select: { block_id: true, is_completed: true },
      });
      const progressMap = new Map(progressRecords.map((p) => [p.block_id, p.is_completed]));

      for (let idx = 0; idx < unit.blocks.length; idx++) {
        const block = unit.blocks[idx];
        if (block.block_type !== 'interaction' || !block.interaction?.channel?.discord_channel_id) continue;

        let isAvailable = true;
        for (let i = 0; i < idx; i++) {
          const prev = unit.blocks[i];
          if (prev.is_required && !progressMap.get(prev.id)) {
            isAvailable = false;
            break;
          }
        }

        const channelId = block.interaction.channel.discord_channel_id;
        try {
          const discordChannel = await client.channels.fetch(channelId) as any;
          if (!discordChannel?.permissionOverwrites || !discordChannel?.guild) continue;

          let member: any;
          try {
            member = await discordChannel.guild.members.fetch(student.discord_id!);
          } catch {
            console.warn(`[bot] Discord user ${student.discord_id} not found in guild — skipping (student ${student.id})`);
            continue;
          }

          const isVoice = discordChannel.type === ChannelType.GuildVoice || discordChannel.type === ChannelType.GuildStageVoice;
          if (isAvailable) {
            await discordChannel.permissionOverwrites.edit(member, isVoice ? { Connect: true } : { ViewChannel: true });
            console.log(`[bot] ✅ Granted ${isVoice ? 'Connect' : 'ViewChannel'} on ${channelId} to student ${student.id}`);
          } else {
            const existing = discordChannel.permissionOverwrites.cache.get(member.id);
            if (existing) {
              await discordChannel.permissionOverwrites.delete(member);
              console.log(`[bot] 🔒 Revoked ViewChannel on ${channelId} from student ${student.id}`);
            }
          }
        } catch (err: any) {
          console.error(`[bot] Permission update failed for channel ${channelId}:`, err?.message ?? err);
        }
      }
    }
  } catch (err: any) {
    console.error('[bot] syncUnitDiscordAccess error:', err?.message ?? err);
  }
}

export async function syncCourseCategoryAccess(unitId: string, studentId?: string): Promise<void> {
  if (!ready) return;

  try {
    const unit = await prisma.unidade.findUnique({ where: { id: unitId }, select: { course_id: true } });
    if (!unit) return;

    const server = await prisma.servidorDiscord.findUnique({
      where: { course_id: unit.course_id },
      select: { discord_guild_id: true },
    });
    if (!server) return;

    const guild = await client.guilds.fetch(server.discord_guild_id);

    const units = await prisma.unidade.findMany({
      where: { course_id: unit.course_id, is_published: true, discord_category_id: { not: null } },
      orderBy: { sequence_order: 'asc' },
      select: {
        id: true,
        discord_category_id: true,
        blocks: {
          where: { status: { not: 'disabled' } },
          select: { id: true, is_required: true },
        },
      },
    });

    if (units.length === 0) return;

    const enrollments = await prisma.matricula.findMany({
      where: {
        course_id: unit.course_id,
        status: 'active',
        ...(studentId ? { student_id: studentId } : {}),
      },
      include: { student: { select: { id: true, discord_id: true } } },
    });

    const students = enrollments.map((e) => e.student).filter((s) => s.discord_id);
    if (students.length === 0) return;

    const allBlockIds = units.flatMap((u) => u.blocks.map((b) => b.id));

    for (const student of students) {
      const progressRecords = await prisma.progressoBloco.findMany({
        where: { student_id: student.id, block_id: { in: allBlockIds } },
        select: { block_id: true, is_completed: true, status: true },
      });
      const progressMap = new Map(progressRecords.map((p) => [p.block_id, p]));

      // First incomplete unit is the student's current unit
      let currentUnitIndex = units.length - 1;
      for (let i = 0; i < units.length; i++) {
        const requiredBlocks = units[i].blocks.filter((b) => b.is_required);
        const unitDone = requiredBlocks.every((b) => {
          const p = progressMap.get(b.id);
          return p?.is_completed || p?.status === 'absent';
        });
        if (!unitDone) {
          currentUnitIndex = i;
          break;
        }
      }

      let member: any;
      try {
        member = await guild.members.fetch(student.discord_id!);
      } catch {
        console.warn(`[bot] Discord user ${student.discord_id} not in guild — skipping category sync`);
        continue;
      }

      for (let i = 0; i < units.length; i++) {
        const categoryId = units[i].discord_category_id!;
        try {
          const category = await guild.channels.fetch(categoryId) as any;
          if (!category?.permissionOverwrites) continue;

          if (i <= currentUnitIndex) {
            await category.permissionOverwrites.edit(member, { ViewChannel: true });
            console.log(`[bot] ✅ Category granted: unit[${i + 1}] → student ${student.id}`);
          } else {
            const existing = category.permissionOverwrites.cache.get(member.id);
            if (existing) {
              await category.permissionOverwrites.delete(member);
              console.log(`[bot] 🔒 Category revoked: unit[${i + 1}] → student ${student.id}`);
            }
          }
        } catch (err: any) {
          console.error(`[bot] Category permission error (unit ${units[i].id}):`, err?.message ?? err);
        }
      }
    }
  } catch (err: any) {
    console.error('[bot] syncCourseCategoryAccess error:', err?.message ?? err);
  }
}

async function completeInteractionBlock(studentId: string, blockId: string): Promise<void> {
  await prisma.progressoBloco.upsert({
    where: { block_id_student_id: { student_id: studentId, block_id: blockId } },
    update: { is_completed: true, completed_at: new Date() },
    create: {
      student_id: studentId,
      block_id: blockId,
      is_completed: true,
      started_at: new Date(),
      completed_at: new Date(),
    },
  });

  const block = await prisma.bloco.findUnique({ where: { id: blockId }, select: { unit_id: true } });
  if (block) {
    syncUnitDiscordAccess(block.unit_id, studentId).catch((err: any) =>
      console.error('[bot] syncUnitDiscordAccess after interaction completion:', err?.message)
    );
    syncCourseCategoryAccess(block.unit_id, studentId).catch((err: any) =>
      console.error('[bot] syncCourseCategoryAccess after interaction completion:', err?.message)
    );
  }
}

async function resolveBlockInfo(discordChannelId: string): Promise<InteractionBlockInfo | null> {
  const cached = interactionChannelMap.get(discordChannelId);
  if (cached) return cached;

  const inter = await prisma.blocoInteracao.findFirst({
    where: { channel: { discord_channel_id: discordChannelId } },
    include: {
      channel: true,
      block: { select: { id: true, config_json: true } },
    },
  });
  if (inter?.channel) {
    const config = (inter.block.config_json as Record<string, unknown>) ?? {};
    const minMessages = typeof config.minMessages === 'number' ? config.minMessages : 1;
    const info: InteractionBlockInfo = {
      blockId: inter.block_id,
      interactionType: inter.interaction_type,
      minMessages,
      scheduledAt: inter.scheduled_at,
    };
    interactionChannelMap.set(discordChannelId, info);
    console.log(`[bot] Channel ${discordChannelId} resolved from DB and cached (block ${inter.block_id})`);
    return info;
  }

  const consol = await prisma.blocoConsolidacao.findFirst({
    where: { channel: { discord_channel_id: discordChannelId }, consolidation_type: 'guided_stage' },
    include: { channel: true },
  });
  if (consol?.channel) {
    const info: InteractionBlockInfo = {
      blockId: consol.block_id,
      interactionType: 'voice',
      minMessages: 1,
      scheduledAt: consol.scheduled_at,
    };
    interactionChannelMap.set(discordChannelId, info);
    console.log(`[bot] Consolidation channel ${discordChannelId} resolved from DB and cached (block ${consol.block_id})`);
    return info;
  }

  return null;
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const parentId = (message.channel as any).parentId as string | null | undefined;

  let blockInfo = await resolveBlockInfo(message.channelId);
  if (!blockInfo && parentId) blockInfo = await resolveBlockInfo(parentId);

  if (!blockInfo) return;
  if (blockInfo.interactionType === 'voice') return;

  console.log(`[bot] Message in interaction channel ${message.channelId} from Discord user ${message.author.id} (block ${blockInfo.blockId}, type ${blockInfo.interactionType})`);

  try {
    const student = await prisma.usuario.findUnique({
      where: { discord_id: message.author.id },
      select: { id: true },
    });
    if (!student) {
      console.warn(`[bot] No platform user found for Discord ID ${message.author.id} — student may not have linked account`);
      return;
    }

    const existing = await prisma.progressoBloco.findUnique({
      where: { block_id_student_id: { block_id: blockInfo.blockId, student_id: student.id } },
      select: { is_completed: true },
    });
    if (existing?.is_completed) {
      console.log(`[bot] Block ${blockInfo.blockId} already completed for student ${student.id}`);
      return;
    }

    const key = `${message.author.id}:${blockInfo.blockId}`;
    const count = (messageCountCache.get(key) ?? 0) + 1;
    messageCountCache.set(key, count);
    console.log(`[bot] Student ${student.id} message count: ${count}/${blockInfo.minMessages}`);

    if (count >= blockInfo.minMessages) {
      await completeInteractionBlock(student.id, blockInfo.blockId);
      messageCountCache.delete(key);
      console.log(`[bot] ✅ Interaction block ${blockInfo.blockId} completed by student ${student.id}`);
    }
  } catch (err: any) {
    console.error('[bot] Error processing messageCreate:', err?.message ?? err);
  }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (oldState.channelId || !newState.channelId) return;

  const blockInfo = await resolveBlockInfo(newState.channelId);
  if (!blockInfo || blockInfo.interactionType !== 'voice') return;

  if (blockInfo.scheduledAt) {
    const now = new Date();
    const s = blockInfo.scheduledAt;
    const sameDay =
      now.getUTCFullYear() === s.getUTCFullYear() &&
      now.getUTCMonth() === s.getUTCMonth() &&
      now.getUTCDate() === s.getUTCDate();
    if (!sameDay) {
      console.log(`[bot] Voice join ignored — not the scheduled day (scheduled: ${s.toISOString()}, now: ${now.toISOString()})`);
      return;
    }
  }

  const discordId = newState.member?.user?.id;
  if (!discordId || newState.member?.user?.bot) return;

  console.log(`[bot] Voice join in ${newState.channelId} from Discord user ${discordId} (block ${blockInfo.blockId})`);

  try {
    const student = await prisma.usuario.findUnique({
      where: { discord_id: discordId },
      select: { id: true },
    });
    if (!student) {
      console.warn(`[bot] No platform user found for Discord ID ${discordId}`);
      return;
    }

    await completeInteractionBlock(student.id, blockInfo.blockId);
    console.log(`[bot] ✅ Voice block ${blockInfo.blockId} completed by student ${student.id}`);
  } catch (err: any) {
    console.error('[bot] Error processing voiceStateUpdate:', err?.message ?? err);
  }
});

const slashCommands = [
  new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Ressincroniza o acesso dos estudantes aos canais das aulas deste servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
];

async function registerSlashCommands(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN!;
  const clientId = client.user!.id;
  const rest = new REST().setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: slashCommands });
    console.log('[bot] Slash commands registered globally');
  } catch (err: any) {
    console.error('[bot] Failed to register slash commands:', err?.message ?? err);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'sync') return;

  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply('Este comando só pode ser usado dentro de um servidor.');
    return;
  }

  try {
    const server = await prisma.servidorDiscord.findUnique({
      where: { discord_guild_id: guildId },
      include: { course: { include: { units: { where: { is_published: true } } } } },
    });

    if (!server) {
      await interaction.editReply('Este servidor não está vinculado a nenhum curso no EduHub.');
      return;
    }

    const units = server.course.units;
    if (units.length === 0) {
      await interaction.editReply('Nenhuma aula publicada encontrada neste curso.');
      return;
    }

    for (const unit of units) {
      await syncUnitDiscordAccess(unit.id);
    }
    if (units.length > 0) {
      await syncCourseCategoryAccess(units[0].id);
    }

    const n = units.length;
    await interaction.editReply(`✅ Sincronização concluída! ${n} aula${n !== 1 ? 's' : ''} sincronizada${n !== 1 ? 's' : ''}.`);
  } catch (err: any) {
    console.error('[bot] /sync error:', err?.message ?? err);
    await interaction.editReply('❌ Ocorreu um erro durante a sincronização. Tente novamente.');
  }
});

client.once(Events.ClientReady, async () => {
  ready = true;
  console.log(`Discord bot online: ${client.user?.tag}`);
  await loadInteractionChannels();
  await registerSlashCommands();
});

export function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.warn('DISCORD_BOT_TOKEN not set — bot disabled');
    return;
  }
  client.login(token).catch((err) => {
    console.error('Failed to start Discord bot:', err.message);
  });
}

export function isReady() {
  return ready;
}

const THREAD_WELCOME_MESSAGE = `Bem-vindo ao canal de tópicos desta aula! 👋

Este espaço é dedicado a discussões organizadas por tópicos. Veja como participar:

📌 **Acessar tópicos** — Os tópicos de discussão aparecem organizados neste canal. Clique em um tópico para participar da conversa.

💬 **Responder** — Dentro de cada tópico, contribua com suas ideias, respostas e dúvidas.

👍 **Reagir** — Use as reações para demonstrar concordância ou que achou uma mensagem útil.

📌 **Boas práticas**
→ Mantenha as discussões dentro do tópico correto
→ Seja respeitoso e construtivo
→ Leia as mensagens anteriores antes de responder

Boas discussões! 🚀`;

const FORUM_WELCOME_TITLE = '📌 Como usar este fórum';

const FORUM_WELCOME_MESSAGE = `Bem-vindo ao fórum desta aula! 👋

Este é o espaço para discussões, dúvidas e troca de ideias com a turma. Veja como participar:

📝 **Criar um tópico** — Clique em "Nova Publicação" para iniciar uma discussão ou tirar uma dúvida. Use um título claro e descritivo.

💬 **Responder** — Acesse os tópicos criados pelos colegas e contribua com respostas, perspectivas ou complementos.

👍 **Reagir** — Use as reações do Discord para demonstrar que achou uma resposta útil ou que concorda com algo.

📌 **Boas práticas**
→ Mantenha as discussões relacionadas ao conteúdo da aula
→ Seja respeitoso e construtivo
→ Antes de criar um novo tópico, verifique se já existe um similar

Boas discussões!`;

function slugify(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export async function createLessonCategory(guildId: string, lessonTitle: string): Promise<string> {
  const guild = await client.guilds.fetch(guildId);
  const category = await guild.channels.create({
    name: lessonTitle,
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...(client.user ? [{ id: client.user.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
    ],
  });
  return category.id;
}

async function everyoneDenyWithBotAccess(guildId: string) {
  const guild = await client.guilds.fetch(guildId);
  const overwrites: { id: string; allow?: bigint[]; deny?: bigint[] }[] = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
  ];
  if (client.user) {
    overwrites.push({ id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages] });
  }
  return overwrites;
}

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'https://eduhub.vercel.app';

const ANNOUNCEMENT_MESSAGES: Record<string, { initial: string; update: string }> = {
  content: {
    initial: `📢 @everyone **Conteúdos disponíveis!** Novos materiais foram cadastrados nesta aula. Acesse a plataforma para visualizar: ${FRONTEND_URL}`,
    update:  `📢 @everyone **Novos conteúdos adicionados!** Novos materiais foram adicionados à aula. Confira na plataforma: ${FRONTEND_URL}`,
  },
  activity: {
    initial: `📋 @everyone **Atividades disponíveis!** Atividades foram cadastradas nesta aula. Acesse a plataforma: ${FRONTEND_URL}`,
    update:  `📋 @everyone **Novas atividades adicionadas!** Novas atividades foram adicionadas à aula. Confira na plataforma: ${FRONTEND_URL}`,
  },
};

const ANNOUNCEMENT_CHANNEL_NAMES: Record<string, string> = {
  content:  'conteudos',
  activity: 'atividades',
};

export async function createAnnouncementChannel(guildId: string, categoryId: string, blockTypeGroup: string): Promise<string> {
  const guild = await client.guilds.fetch(guildId);
  const hasCommunity = (guild.features as unknown as string[]).includes('COMMUNITY');
  const channel = await guild.channels.create({
    name: ANNOUNCEMENT_CHANNEL_NAMES[blockTypeGroup] ?? blockTypeGroup,
    type: hasCommunity ? ChannelType.GuildAnnouncement : ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages] },
    ],
  });
  return channel.id;
}

export async function sendAnnouncementMessage(channelId: string, blockTypeGroup: string, isUpdate: boolean): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN!;
  const rest = new REST().setToken(token);
  const msgs = ANNOUNCEMENT_MESSAGES[blockTypeGroup];
  if (!msgs) return;
  await rest.post(Routes.channelMessages(channelId), {
    body: { content: isUpdate ? msgs.update : msgs.initial },
  });
}

export async function createDiscordTextChannel(guildId: string, categoryId: string, name: string): Promise<string> {
  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.create({
    name: slugify(name),
    type: ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites: await everyoneDenyWithBotAccess(guildId),
  });
  return channel.id;
}

export async function createForumWelcomePost(channelId: string): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN!;
  const rest = new REST().setToken(token);
  const imagePath = join(process.cwd(), '..', 'frontend', 'public', 'forum-icon-message.png');
  const imageData = readFileSync(imagePath);
  const thread = await rest.post(Routes.threads(channelId), {
    body: {
      name: FORUM_WELCOME_TITLE,
      message: {
        content: FORUM_WELCOME_MESSAGE,
        attachments: [{ id: '0', filename: 'forum-icon-message.png' }],
      },
    },
    files: [{ name: 'forum-icon-message.png', data: imageData, contentType: 'image/png' }],
  }) as any;

  await rest.post(Routes.channelMessages(thread.id), {
    body: { content: 'https://www.imagensanimadas.com/data/media/134/linha-divisoria-imagem-animada-0132.gif' },
  });
}

export async function createDiscordForumChannel(guildId: string, categoryId: string, name: string): Promise<string> {
  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.create({
    name: slugify(name),
    type: ChannelType.GuildForum,
    parent: categoryId,
    permissionOverwrites: await everyoneDenyWithBotAccess(guildId),
  });

  try {
    await createForumWelcomePost(channel.id);
  } catch (err: any) {
    console.warn('[forum] welcome post failed:', err?.message ?? err);
  }

  return channel.id;
}

export async function createDiscordVoiceChannel(guildId: string, categoryId: string, name: string, preferStage = false): Promise<string> {
  const guild = await client.guilds.fetch(guildId);
  const isStage = preferStage && (guild.features as unknown as string[]).includes('COMMUNITY');
  const overwrites: any[] = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] },
  ];
  if (client.user) {
    overwrites.push({ id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] });
  }
  const channel = await guild.channels.create({
    name: slugify(name),
    type: isStage ? ChannelType.GuildStageVoice : ChannelType.GuildVoice,
    parent: categoryId,
    permissionOverwrites: overwrites,
  });
  return channel.id;
}

export async function createDiscordThreadChannel(
  guildId: string,
  categoryId: string,
  name: string,
  initialMessage?: string,
  topicName?: string,
): Promise<string> {
  const token = process.env.DISCORD_BOT_TOKEN!;
  const rest = new REST().setToken(token);
  const guild = await client.guilds.fetch(guildId);

  const channel = await guild.channels.create({
    name: slugify(name),
    type: ChannelType.GuildText,
    parent: categoryId,
  });

  await rest.post(Routes.channelMessages(channel.id), {
    body: { content: THREAD_WELCOME_MESSAGE },
  });

  const thread = await rest.post(Routes.threads(channel.id), {
    body: { name: (topicName || name).slice(0, 100), type: 11, auto_archive_duration: 1440 },
  }) as any;
  await rest.post(Routes.channelMessages(thread.id), {
    body: { content: initialMessage ?? '👋 Tópico de discussão aberto.' },
  });

  await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });

  return channel.id;
}

export async function createThreadInChannel(channelId: string, name: string, initialMessage?: string, topicName?: string): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN!;
  const rest = new REST().setToken(token);
  const thread = await rest.post(Routes.threads(channelId), {
    body: { name: (topicName || name).slice(0, 100), type: 11, auto_archive_duration: 1440 },
  }) as any;
  await rest.post(Routes.channelMessages(thread.id), {
    body: { content: initialMessage ?? '👋 Tópico de discussão aberto.' },
  });
}

export async function createDiscordScheduledEvent(
  guildId: string,
  channelId: string,
  name: string,
  scheduledAt: Date,
  description?: string,
): Promise<void> {
  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(channelId);
  const entityType = channel?.type === ChannelType.GuildStageVoice
    ? GuildScheduledEventEntityType.StageInstance
    : GuildScheduledEventEntityType.Voice;

  const imagePath = join(process.cwd(), '..', 'frontend', 'public', 'event-icon-message.png');
  const imageData = readFileSync(imagePath);
  const imageBase64 = `data:image/png;base64,${imageData.toString('base64')}`;

  await guild.scheduledEvents.create({
    channel: channelId,
    name: name.slice(0, 100),
    scheduledStartTime: scheduledAt,
    privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
    entityType,
    ...(description ? { description: description.slice(0, 1000) } : {}),
    image: imageBase64,
  });
}

export async function deleteDiscordChannel(channelId: string): Promise<void> {
  const channel = await client.channels.fetch(channelId);
  if (channel && 'delete' in channel) await (channel as any).delete();
}

export async function createPermanentInvite(guildId: string): Promise<string> {
  const guild = await client.guilds.fetch(guildId);
  const channels = await guild.channels.fetch();
  const textChannel = channels.find(c => c?.type === ChannelType.GuildText);
  if (!textChannel || !('createInvite' in textChannel)) {
    throw new Error('No text channel found to create invite');
  }
  const invite = await (textChannel as any).createInvite({ maxAge: 0, maxUses: 0, unique: false });
  return `https://discord.gg/${invite.code}`;
}

export async function sendMessageToChannel(channelId: string, content: string): Promise<void> {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !(channel instanceof TextChannel)) {
    throw new Error(`Channel ${channelId} not found or not a text channel`);
  }
  await channel.send(content);
}

export { client };
