import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

export const SESSION_COOKIE = "sftp_session"
const ALG = "HS256"
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function secret(): Uint8Array {
    const s = process.env.AUTH_SECRET
    if (!s) throw new Error("AUTH_SECRET is not set")
    return new TextEncoder().encode(s)
}

/** Constant-time-ish string compare (avoids early-exit timing leaks). */
function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let r = 0
    for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return r === 0
}

/** Validate submitted credentials against AUTH_USERNAME / AUTH_PASSWORD. */
export function checkCredentials(username: string, password: string): boolean {
    const U = process.env.AUTH_USERNAME
    const P = process.env.AUTH_PASSWORD
    if (!U || !P) return false
    return safeEqual(username, U) && safeEqual(password, P)
}

export async function createSession(username: string): Promise<string> {
    return new SignJWT({ u: username })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secret())
}

export async function verifySession(token: string | undefined): Promise<{ u: string } | null> {
    if (!token) return null
    try {
        const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] })
        return { u: String(payload.u) }
    } catch {
        return null
    }
}

/** Current session from the request cookies (server components / route handlers). */
export async function getSession(): Promise<{ u: string } | null> {
    const store = await cookies()
    return verifySession(store.get(SESSION_COOKIE)?.value)
}

export const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
}
