import NextAuth from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: 'identify email guilds' } },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'discord') return false;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discord_id: account.providerAccountId,
            name: user.name,
            email: user.email,
            avatar: user.image,
          }),
        });
        if (!res.ok) return false;
        const dbUser = await res.json();
        (user as any).dbId = dbUser.id;
        (user as any).role = dbUser.role;
        (user as any).discord_id = dbUser.discord_id;
      } catch {
        return false;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.dbId = (user as any).dbId;
        token.role = (user as any).role;
        token.discord_id = (user as any).discord_id;
        token.discordAccessToken = account?.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.dbId = token.dbId as string;
      session.user.role = token.role as string;
      session.user.discord_id = token.discord_id as string;
      session.discordAccessToken = token.discordAccessToken as string;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});

export { handler as GET, handler as POST };
