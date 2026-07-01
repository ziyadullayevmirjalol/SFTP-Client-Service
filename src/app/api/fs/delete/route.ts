import { NextResponse } from "next/server"
import { getStorage } from "@/lib/storage"

export const dynamic = "force-dynamic"

/** Delete files and/or folders. A pathname ending in "/" is expanded to all its objects. */
export async function POST(req: Request) {
    try {
        const { pathnames } = await req.json().catch(() => ({}))
        if (!Array.isArray(pathnames) || pathnames.length === 0) {
            return NextResponse.json({ error: "pathnames required" }, { status: 400 })
        }

        const storage = getStorage()
        const targets = new Set<string>()
        for (const p of pathnames) {
            if (typeof p !== "string") continue
            if (p.endsWith("/")) {
                for (const k of await storage.listAllKeys(p)) targets.add(k)
            } else {
                targets.add(p)
            }
        }

        await storage.delete([...targets])
        return NextResponse.json({ ok: true, deleted: targets.size })
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
}
