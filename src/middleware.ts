import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"

/**
 * Hard auth gate: NOTHING is reachable without a valid session. Runs on every request
 * (except Next internals/static). Only /login and the login API are public. Uses jose
 * directly (edge-runtime safe) rather than importing the node-only auth helpers.
 */

const SESSION_COOKIE = "sftp_session"
const PUBLIC_PATHS = ["/login"]
const PUBLIC_APIS = ["/api/auth/login"]

async function isAuthed(req: NextRequest): Promise<boolean> {
    const token = req.cookies.get(SESSION_COOKIE)?.value
    const s = process.env.AUTH_SECRET
    if (!token || !s) return false
    try {
        await jwtVerify(token, new TextEncoder().encode(s), { algorithms: ["HS256"] })
        return true
    } catch {
        return false
    }
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl
    const authed = await isAuthed(req)

    const isPublicPage = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))
    const isPublicApi = PUBLIC_APIS.some(p => pathname === p)

    if (isPublicPage || isPublicApi) {
        // Already signed in and hitting /login → send home.
        if (authed && pathname === "/login") {
            return NextResponse.redirect(new URL("/", req.url))
        }
        return NextResponse.next()
    }

    if (!authed) {
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 })
        }
        const url = new URL("/login", req.url)
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
