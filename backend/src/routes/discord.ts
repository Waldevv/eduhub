import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { REST, Routes } from 'discord.js';
import {
  client as discordClient,
  createLessonCategory,
  createDiscordTextChannel,
  createDiscordForumChannel,
  createDiscordVoiceChannel,
  createDiscordThreadChannel,
  createThreadInChannel,
  createForumWelcomePost,
  createDiscordScheduledEvent,
  createAnnouncementChannel,
  sendAnnouncementMessage,
  syncUnitDiscordAccess,
  createPermanentInvite,
} from '../lib/discord-bot';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/user-guilds', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const user = await (await import('../lib/prisma')).prisma.usuario.findUnique({
    where: { id: userId },
    select: { discord_access_token: true, discord_token_expires: true },
  });

  if (!user?.discord_access_token) {
    return res.status(400).json({ error: 'No Discord access token — re-login required' });
  }

  if (user.discord_token_expires && new Date() > user.discord_token_expires) {
    return res.status(400).json({ error: 'Discord token expired — re-login required' });
  }

  try {
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${user.discord_access_token}` },
    });
    if (!response.ok) throw new Error(`Discord API ${response.status}`);

    const guilds = await response.json() as any[];
    const MANAGE_GUILD = 0x20;
    const filtered = guilds.filter(g => g.owner || (parseInt(g.permissions) & MANAGE_GUILD) !== 0);

    res.json(filtered.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64`
        : null,
      owner: g.owner,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Failed to fetch guilds' });
  }
});

router.get('/bot-status/:guildId', async (req: Request, res: Response) => {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return res.json({ inGuild: false, hasCommunity: false });
  try {
    const rest = new REST().setToken(token);
    const guild = await rest.get(Routes.guild(req.params.guildId)) as any;
    const hasCommunity = (guild.features as string[]).includes('COMMUNITY');
    res.json({ inGuild: true, hasCommunity });
  } catch {
    res.json({ inGuild: false, hasCommunity: false });
  }
});

router.get('/channels/:guildId', async (req: Request, res: Response) => {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return res.json([]);
  try {
    const rest = new REST().setToken(token);
    const channels = await rest.get(Routes.guildChannels(req.params.guildId)) as any[];
    const allowed = channels.filter((c) => [0, 2, 5].includes(c.type));
    res.json(allowed.map((c) => ({ id: c.id, name: c.name, type: c.type })));
  } catch {
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

const ANNOUNCEMENT_BLOCK_TYPES = ['content', 'activity'];

router.post('/publish-lesson/:unitId', async (req: Request, res: Response) => {
  try {
    const unit = await prisma.unidade.findUnique({
      where: { id: req.params.unitId },
      include: {
        course: { include: { discord_server: true } },
        blocks: { include: { interaction: { include: { channel: true } }, consolidation: { include: { channel: true } } } },
        announcement_channels: true,
      },
    });

    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (!unit.course.discord_server) return res.status(400).json({ error: 'No Discord server linked to this course' });

    const guildId = unit.course.discord_server.discord_guild_id;
    const serverId = unit.course.discord_server.id;

    const interactionBlocks = unit.blocks.filter((b) => b.block_type === 'interaction');
    const announcementBlockTypes = [...new Set(
      unit.blocks.filter((b) => ANNOUNCEMENT_BLOCK_TYPES.includes(b.block_type)).map((b) => b.block_type)
    )];

    const hasAnythingToDo = interactionBlocks.some((b) => {
      const cfg = b.config_json as any;
      return cfg?.channelSource === 'new' && !b.interaction?.channel_id;
    }) || announcementBlockTypes.length > 0 || unit.blocks.some((b) => {
      const cfg = b.config_json as any;
      return b.block_type === 'consolidation' && cfg?.consolidationType === 'guided_stage' && !(b as any).consolidation?.channel_id;
    });

    if (!hasAnythingToDo) return res.json({ ok: true, created: 0 });

    let categoryId: string | null = (unit as any).discord_category_id ?? null;

    if (!categoryId) {
      const existingChannel = unit.blocks.find((b) => b.interaction?.channel?.discord_channel_id);
      if (existingChannel) {
        try {
          const ch = await discordClient.channels.fetch(existingChannel.interaction!.channel!.discord_channel_id) as any;
          categoryId = ch?.parentId ?? null;
        } catch {}
      }
      if (!categoryId && unit.announcement_channels.length > 0) {
        try {
          const ch = await discordClient.channels.fetch(unit.announcement_channels[0].discord_channel_id) as any;
          categoryId = ch?.parentId ?? null;
        } catch {}
      }
    }

    if (!categoryId) {
      categoryId = await createLessonCategory(guildId, `📂 | ${unit.title}`);
      await prisma.unidade.update({ where: { id: unit.id }, data: { discord_category_id: categoryId } as any });
    }

    let created = 0;

    for (const block of interactionBlocks) {
      if (block.interaction?.channel_id) continue;
      const cfg = block.config_json as any;
      if (!cfg?.interactionType) continue;

      let discordChannelId: string;
      const channelName = cfg.channelName || block.title;

      if (cfg.channelSource === 'existing' && cfg.existingChannelId) {
        discordChannelId = cfg.existingChannelId;
        if (cfg.interactionType === 'thread') {
          await createThreadInChannel(discordChannelId, channelName, cfg.initialMessage, cfg.topicName);
        }
        if (cfg.interactionType === 'forum') {
          try { await createForumWelcomePost(discordChannelId); } catch {}
        }
      } else {
        switch (cfg.interactionType) {
          case 'forum':
            discordChannelId = await createDiscordForumChannel(guildId, categoryId, channelName);
            break;
          case 'voice':
            discordChannelId = await createDiscordVoiceChannel(guildId, categoryId, channelName, cfg.callType === 'stage');
            if (cfg.scheduledAt) {
              try {
                await createDiscordScheduledEvent(guildId, discordChannelId, channelName, new Date(cfg.scheduledAt), cfg.eventDescription);
              } catch (err: any) {
                console.warn('[voice] scheduled event creation failed:', err?.message ?? err);
              }
            }
            break;
          case 'thread':
            discordChannelId = await createDiscordThreadChannel(guildId, categoryId, channelName, cfg.initialMessage, cfg.topicName);
            break;
          default:
            discordChannelId = await createDiscordTextChannel(guildId, categoryId, channelName);
        }
      }

      const canal = await prisma.canalDiscord.create({
        data: {
          server_id: serverId,
          discord_channel_id: discordChannelId,
          name: channelName,
          channel_type: cfg.interactionType,
          created_by_platform: cfg.channelSource !== 'existing',
          is_active: true,
        },
      });

      await prisma.blocoInteracao.upsert({
        where: { block_id: block.id },
        update: {
          channel_id: canal.id,
          interaction_type: cfg.interactionType,
          completion_criteria: cfg.completionCriteria || 'access',
          title: channelName,
          initial_message: cfg.initialMessage || null,
          scheduled_at: cfg.scheduledAt ? new Date(cfg.scheduledAt) : null,
        },
        create: {
          block_id: block.id,
          interaction_type: cfg.interactionType,
          completion_criteria: cfg.completionCriteria || 'access',
          title: channelName,
          initial_message: cfg.initialMessage || null,
          scheduled_at: cfg.scheduledAt ? new Date(cfg.scheduledAt) : null,
          channel_id: canal.id,
        },
      });

      created++;
    }

    const consolidationBlocks = unit.blocks.filter((b) => b.block_type === 'consolidation');
    for (const block of consolidationBlocks) {
      const cfg = block.config_json as any;
      if (cfg?.consolidationType !== 'guided_stage') continue;
      if ((block as any).consolidation?.channel_id) continue;

      const channelName = cfg.channelName || block.title;
      const discordChannelId = await createDiscordVoiceChannel(guildId, categoryId, channelName, cfg.callType === 'stage');
      if (cfg.scheduledAt) {
        try {
          await createDiscordScheduledEvent(guildId, discordChannelId, channelName, new Date(cfg.scheduledAt), cfg.eventDescription);
        } catch (err: any) {
          console.warn('[consolidation] scheduled event failed:', err?.message ?? err);
        }
      }

      const canal = await prisma.canalDiscord.create({
        data: {
          server_id: serverId,
          discord_channel_id: discordChannelId,
          name: channelName,
          channel_type: cfg.callType === 'stage' ? 'stage' : 'voice',
          created_by_platform: true,
          is_active: true,
        },
      });

      await prisma.blocoConsolidacao.upsert({
        where: { block_id: block.id },
        update: { channel_id: canal.id, consolidation_type: 'guided_stage', scheduled_at: cfg.scheduledAt ? new Date(cfg.scheduledAt) : null },
        create: { block_id: block.id, consolidation_type: 'guided_stage', scheduled_at: cfg.scheduledAt ? new Date(cfg.scheduledAt) : null, channel_id: canal.id },
      });

      created++;
    }

    const newBlockTypes: string[] = req.body?.newBlockTypes ?? [];
    const existingAnnouncementTypes = new Set(unit.announcement_channels.map((c) => (c as any).block_type_group));

    for (const blockType of announcementBlockTypes) {
      const isUpdate = existingAnnouncementTypes.has(blockType);

      if (!isUpdate) {
        const discordChannelId = await createAnnouncementChannel(guildId, categoryId, blockType);
        await prisma.canalDiscord.create({
          data: {
            server_id: serverId,
            discord_channel_id: discordChannelId,
            name: blockType,
            channel_type: 'announcement',
            created_by_platform: true,
            is_active: true,
            unit_id: unit.id,
            block_type_group: blockType,
          } as any,
        });
        await sendAnnouncementMessage(discordChannelId, blockType, false);
        created++;
      } else if (newBlockTypes.includes(blockType)) {
        const existing = unit.announcement_channels.find((c) => (c as any).block_type_group === blockType);
        if (existing) {
          await sendAnnouncementMessage(existing.discord_channel_id, blockType, true);
        }
      }
    }

    syncUnitDiscordAccess(req.params.unitId).catch((err: any) =>
      console.error('[publish-lesson] syncUnitDiscordAccess failed:', err?.message ?? err)
    );

    res.json({ ok: true, created });
  } catch (err: any) {
    console.error('publish-lesson error:', err);
    res.status(500).json({ error: err.message ?? 'Failed to publish lesson channels' });
  }
});

router.get('/server/:courseId', async (req: Request, res: Response) => {
  try {
    const server = await prisma.servidorDiscord.findUnique({
      where: { course_id: req.params.courseId },
      include: { channels: true },
    });
    if (!server) return res.status(404).json({ error: 'No server linked' });
    res.json(server);
  } catch {
    res.status(500).json({ error: 'Failed to fetch server' });
  }
});

router.post('/server/:courseId/regenerate-invite', async (req: Request, res: Response) => {
  try {
    const server = await prisma.servidorDiscord.findUnique({
      where: { course_id: req.params.courseId },
    });
    if (!server) return res.status(404).json({ error: 'No server linked' });

    const discord_invite_url = await createPermanentInvite(server.discord_guild_id);
    await prisma.servidorDiscord.update({
      where: { course_id: req.params.courseId },
      data: { discord_invite_url },
    });
    res.json({ discord_invite_url });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? 'Failed to generate invite' });
  }
});

router.post('/server', async (req: Request, res: Response) => {
  const { course_id, discord_guild_id, server_name } = req.body;
  const teacher_id = (req as any).user?.id;
  if (!course_id || !teacher_id || !discord_guild_id || !server_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    let discord_invite_url: string | undefined;
    try {
      discord_invite_url = await createPermanentInvite(discord_guild_id);
    } catch (err: any) {
      console.warn('[link-server] invite creation failed:', err?.message ?? err);
    }

    const server = await prisma.servidorDiscord.upsert({
      where: { course_id },
      update: { discord_guild_id, server_name, is_active: true, ...(discord_invite_url ? { discord_invite_url } : {}) },
      create: { course_id, teacher_id, discord_guild_id, server_name, discord_invite_url },
    });
    res.status(201).json(server);
  } catch {
    res.status(500).json({ error: 'Failed to link server' });
  }
});

router.delete('/server/:courseId', async (req: Request, res: Response) => {
  try {
    await prisma.servidorDiscord.delete({ where: { course_id: req.params.courseId } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to unlink server' });
  }
});

export default router;
