import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    discordAccessToken: string;
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      dbId: string;
      role: string;
      discord_id: string;
    };
  }
}
