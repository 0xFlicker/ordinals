import { serialize, parse } from "cookie";

const bitcoinCookieName =
  process.env.BITCOIN_SESSION_COOKIE || "bitflick.siwb-session";
const ethereumCookieName =
  process.env.ETHEREUM_SESSION_COOKIE || "bitflick.siwe-session";
const sessionCookieName = process.env.SESSION_COOKIE || "bitflick.session";

export const ethereumSessionExpirationSeconds =
  Number(process.env.SIWE_EXPIRATION_TIME_SECONDS) || 60 * 60 * 24 * 7;
export const bitcoinSessionExpirationSeconds =
  Number(process.env.SIWB_EXPIRATION_TIME_SECONDS) || 60 * 60 * 24 * 365;
export const sessionCookieExpirationSeconds =
  Number(process.env.SESSION_COOKIE_EXPIRATION_TIME_SECONDS) ||
  ethereumSessionExpirationSeconds;

export function sessionFromNamespace(namespace?: string) {
  // because siwe was first....
  if (namespace === "siwb") {
    return bitcoinCookieName;
  } else if (namespace === "siwe") {
    return ethereumCookieName;
  }
  return sessionCookieName;
}

export function sessionExpirationFromNamespace(namespace?: string) {
  if (namespace === "siwb") {
    return bitcoinSessionExpirationSeconds;
  } else if (namespace === "siwe") {
    return ethereumSessionExpirationSeconds;
  }
  return sessionCookieExpirationSeconds;
}

export function serializeSessionCookie({
  value,
  path,
  cookieName,
  expires,
}: {
  value: string;
  path: string;
  cookieName: string;
  expires: Date;
}) {
  return serialize(cookieName, value, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    httpOnly: true,
    expires,
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
    sameSite: "none",
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
