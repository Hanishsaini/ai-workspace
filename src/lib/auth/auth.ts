import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import { getServerEnv } from "@/config/env";
import { CURSOR_COLORS } from "@/config/constants";

/**
 * NextAuth (v4) config. Production-grade OAuth + a deliberately-gated dev
 * credentials path:
 *
 *   - Google + GitHub providers are wired when their env keys are set.
 *   - The PrismaAdapter persists OAuth Account/Session/VerificationToken
 *     rows (already present in the schema). Session strategy stays JWT so
 *     route handlers and the realtime token endpoint stay stateless.
 *   - On `createUser` (fires once per new account ever — OAuth path only,
 *     the adapter calls it before sign-in completes) we provision a
 *     personal workspace so a fresh sign-in always has somewhere to land.
 *   - The dev-only CredentialsProvider (email lookup, no password) is
 *     enabled only when ENABLE_DEV_LOGIN="true" or when NODE_ENV !=
 *     production AND ENABLE_DEV_LOGIN is unset. Production deploys never
 *     ship with credentials login unless explicitly opted in.
 *
 * NextAuth v5 (Auth.js) is the long-term target; staying on v4 here to
 * keep the realtime token + socket auth pipeline stable. The shape below
 * isolates auth from the rest of the app, so v5 migration is a localized
 * swap.
 */

function devLoginEnabled(): boolean {
  const flag = process.env.ENABLE_DEV_LOGIN;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

function buildProviders(): NextAuthOptions["providers"] {
  const env = getServerEnv();
  const providers: NextAuthOptions["providers"] = [];

  // DEMO MODE: `allowDangerousEmailAccountLinking: true` is temporarily enabled
  // so the demo recording flow works (the user hit OAuthAccountNotLinked when
  // attempting to switch providers, and silent failures in the OAuth callback
  // were leaving orphan User rows). MUST be flipped back to false before any
  // public sharing — see [[project-deferred-credential-rotation]] memory.
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (env.GITHUB_ID && env.GITHUB_SECRET) {
    providers.push(
      GitHubProvider({
        clientId: env.GITHUB_ID,
        clientSecret: env.GITHUB_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (devLoginEnabled()) {
    providers.push(
      CredentialsProvider({
        id: "dev",
        name: "Dev Login",
        credentials: { email: { label: "Email", type: "email" } },
        async authorize(credentials) {
          if (!credentials?.email) return null;
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          if (!user) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        },
      }),
    );
  }

  return providers;
}

/**
 * LAZY INITIALIZATION
 * `authOptions` used to be a top-level `const` whose initializer called
 * `getServerEnv().NEXTAUTH_SECRET` and `buildProviders()` — both of which
 * trigger full server-env validation. That meant simply *importing* anything
 * that touches auth (every protected route, `getCurrentUser`, etc.) ran env
 * validation at module load, which fails the Vercel `collect page data`
 * build step before user-supplied env vars are even available to the route.
 *
 * The factory + Proxy below defers construction until the first property
 * read, which only happens when NextAuth actually handles a request.
 */
let _authOptions: NextAuthOptions | null = null;
function buildAuthOptions(): NextAuthOptions {
  if (_authOptions) return _authOptions;
  _authOptions = {
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    secret: getServerEnv().NEXTAUTH_SECRET,
    providers: buildProviders(),
    pages: {
      signIn: "/login",
      error: "/login",
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) token.uid = user.id;
        return token;
      },
      async session({ session, token }) {
        if (token.uid && session.user) {
          (session.user as { id?: string }).id = token.uid as string;
        }
        return session;
      },
    },
    events: {
      /**
       * Fires exactly once per User row creation — i.e. the moment an OAuth
       * sign-in lands a brand new account. Provision a personal workspace so
       * the user has somewhere to go immediately after auth.
       *
       * Credentials sign-ins bypass the adapter and never reach this event,
       * which is correct: seeded dev users (Alice/Bob) come with their
       * workspaces already created by the seed script.
       */
      async createUser({ user }) {
        const firstName = user.name?.split(" ")[0]?.trim();
        const workspaceName = firstName
          ? `${firstName}'s workspace`
          : "Personal workspace";

        await prisma.workspace.create({
          data: {
            name: workspaceName,
            ownerId: user.id,
            members: {
              create: {
                userId: user.id,
                role: "OWNER",
                cursorColor: CURSOR_COLORS[0],
              },
            },
            conversations: { create: { title: "New conversation" } },
            canvases: { create: { type: "NOTES", snapshot: { blocks: [] } } },
          },
        });
      },
    },
  };
  return _authOptions;
}

export const authOptions: NextAuthOptions = new Proxy(
  {} as NextAuthOptions,
  {
    get(_t, prop) {
      return Reflect.get(buildAuthOptions(), prop);
    },
  },
);
