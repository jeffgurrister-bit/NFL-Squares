import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Build the providers array dynamically so the app still works when Google
// OAuth credentials aren't configured (only Credentials login will be active).
const providers: ReturnType<typeof Credentials>[] | (ReturnType<typeof Credentials> | ReturnType<typeof Google>)[] = [
  Credentials({
    name: "Username & password",
    credentials: {
      username: { label: "Username", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(creds) {
      const ident = String(creds?.username ?? "").trim().toLowerCase();
      const password = String(creds?.password ?? "");
      if (!ident || !password) return null;
      // Accept either username or email for the credentials login.
      const user = await prisma.user.findFirst({
        where: { OR: [{ username: ident }, { email: ident }] },
      });
      if (!user || !user.passwordHash) return null;
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;
      return {
        id: user.id,
        name: user.name ?? user.username ?? null,
        email: user.email ?? null,
        image: user.image ?? null,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }) as never,
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      if (token.uid) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.uid as string },
          select: { isAdmin: true, username: true, name: true },
        });
        token.isAdmin = dbUser?.isAdmin ?? false;
        token.username = dbUser?.username ?? null;
        if (dbUser?.name) token.name = dbUser.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) (session.user as { id?: string }).id = token.uid as string;
      (session.user as { isAdmin?: boolean }).isAdmin = !!token.isAdmin;
      (session.user as { username?: string | null }).username =
        (token.username as string | null) ?? null;
      return session;
    },
  },
});
