import { serialize, parse } from "cookie";

export const bitcoinCookieName =
  process.env.BITCOIN_SESSION_COOKIE || "bitflick.siwb-session";
export const ethereumCookieName =
  process.env.ETHEREUM_SESSION_COOKIE || "bitflick.siwe-session";

export const sessionCookieName =
  process.env.SESSION_COOKIE || "bitflick.session";

export const sessionExpiration =
  Number(process.env.SIWE_EXPIRATION_TIME_SECONDS) || 60 * 60 * 24 * 7;
export function serializeSessionCookie({
  value,
  path,
  cookieName,
}: {
  value: string;
  path: string;
  cookieName: string;
}) {
  return serialize(cookieName, value, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * sessionExpiration),
    path,
  });
}

export function expireSessionCookie({
  cookieName,
  path,
}: {
  cookieName: string;
  path: string;
}) {
  return serialize(cookieName, "", {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
    expires: new Date(0),
    path,
  });
}

export function deserializeSessionCookie({
  cookies,
  cookieName,
}: {
  cookies?: string;
  cookieName: string;
}): string | null {
  return (cookies && parse(cookies)?.[cookieName]) ?? null;
}

export function requireAuth({
  cookieFromHeader,
  cookieName,
}: {
  cookieFromHeader?: string;
  cookieName: string;
}): string | null {
  if (!cookieFromHeader) {
    return null;
  }
  const cookies = parse(cookieFromHeader);
  const sessionCookie = Object.keys(cookies).find((c) => c === cookieName);
  if (!sessionCookie) {
    return null;
  }
  const res = cookies[sessionCookie];
  return res;
}
