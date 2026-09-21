import { cookies, headers } from "next/headers";
import {
  collectAuthTokenCandidates,
  readBearerToken,
} from "@/lib/auth/bearerToken";

/**
 * Same token order as website login: HttpOnly cookies first, Bearer second.
 * Native clients send Authorization; browser clients keep using cookies.
 */
export async function sessionJwtFromCookiesAndBearer() {
  const cookieStore = await cookies();
  let bearer: string | null = null;
  try {
    const headerStore = await headers();
    bearer = readBearerToken(
      headerStore.get("authorization") || headerStore.get("Authorization")
    );
  } catch {
    bearer = null;
  }

  const tokens = collectAuthTokenCandidates({
    cookieAuthTokens: [
      cookieStore.get("authToken")?.value,
      cookieStore.get("token")?.value,
      cookieStore.get("auth_token")?.value,
      cookieStore.get("jwt")?.value,
      cookieStore.get("session")?.value,
    ],
    bearerToken: bearer,
  });

  return tokens[0] || "";
}
