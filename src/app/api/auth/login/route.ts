import { NextResponse } from "next/server"
import { checkCredentials, createSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth"

export async function POST(req: Request) {
    const { username, password } = await req.json().catch(() => ({}))
    if (typeof username !== "string" || typeof password !== "string" || !checkCredentials(username, password)) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }
    const token = await createSession(username)
    const res = NextResponse.json({ ok: true })
    res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS)
    return res
}
