import { NextResponse } from "next/server"
import { getStorage } from "@/lib/storage"

export const dynamic = "force-dynamic"

/** Rename/move a file, or a whole folder (both `from` and `to` ending in "/"). */
export async function POST(req: Request) {
    try {
        const { from, to } = await req.json().catch(() => ({}))
        if (typeof from !== "string" || typeof to !== "string" || !from || !to) {
            return NextResponse.json({ error: "from and to required" }, { status: 400 })
        }

        const storage = getStorage()
        if (from.endsWith("/")) {
            const base = to.replace(/\/?$/, "/")
            const keys = await storage.listAllKeys(from)
            for (const k of keys) {
                await storage.move(k, base + k.slice(from.length))
            }
            return NextResponse.json({ ok: true, moved: keys.length })
        }

        const entry = await storage.move(from, to)
        return NextResponse.json({ ok: true, entry })
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
}
