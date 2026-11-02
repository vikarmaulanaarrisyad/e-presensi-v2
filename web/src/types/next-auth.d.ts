import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string | null;
      nip?: string | null;
      madrasahId?: string | null;
      madrasahName?: string | null;
      loginAt?: number | null;
      expiresAt?: number | null;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: string | null;
    nip?: string | null;
    madrasahId?: string | null;
    madrasahName?: string | null;
    loginAt?: number | null;
    expiresAt?: number | null;
  }
}
