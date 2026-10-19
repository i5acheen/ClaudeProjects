import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Google sign-in (Auth.js). We ask for the `drive.file` scope only, which
 * lets the app see just the files it creates itself — never the rest of
 * your Drive.
 *
 * There is no database: Google's tokens live in an encrypted session cookie
 * and the access token is refreshed here when it expires.
 */

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    accessTokenExpires?: number;
    error?: "RefreshTokenError";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    error?: "RefreshTokenError";
  }
}

/** Optional comma-separated list of Google accounts allowed to sign in. */
function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: `openid email profile ${DRIVE_SCOPE}`,
          // Needed to get a refresh token, so you stay signed in.
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/", error: "/" },
  callbacks: {
    signIn({ user }) {
      const allowed = allowedEmails();
      return allowed.length === 0 || allowed.includes((user.email ?? "").toLowerCase());
    },

    async jwt({ token, account }) {
      // First sign-in: keep Google's tokens.
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: (account.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000,
          refreshToken: account.refresh_token ?? token.refreshToken,
          error: undefined,
        };
      }

      // Still valid for more than a minute.
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 60_000) return token;
      if (!token.refreshToken) return { ...token, error: "RefreshTokenError" as const };

      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.AUTH_GOOGLE_ID ?? "",
            client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
            grant_type: "refresh_token",
            refresh_token: token.refreshToken,
          }),
        });
        const refreshed = (await response.json()) as {
          access_token?: string;
          expires_in?: number;
          refresh_token?: string;
        };
        if (!response.ok || !refreshed.access_token) throw new Error("Token refresh failed");
        return {
          ...token,
          accessToken: refreshed.access_token,
          accessTokenExpires: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
          refreshToken: refreshed.refresh_token ?? token.refreshToken,
          error: undefined,
        };
      } catch {
        return { ...token, error: "RefreshTokenError" as const };
      }
    },

    session({ session, token }) {
      session.accessToken = token.accessToken;
      session.accessTokenExpires = token.accessTokenExpires;
      session.error = token.error;
      return session;
    },
  },
});
