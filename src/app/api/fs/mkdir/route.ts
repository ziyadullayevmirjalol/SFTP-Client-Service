import { NextResponse } from "next/server"
import { getStorage } from "@/lib/storage"

export const dynamic = "force-dynamic"

/** Create an empty folder (a hidden placeholder object materializes it in listings). */
export async function POST(req: Request) {
    try {
        const { prefix } = await req.json().catch(() => ({}))
        if (typeof prefix !== "string" || !prefix.trim()) {
            return NextResponse.json({ error: "prefix required" }, { status: 400 })
        }
        await getStorage().createFolder(prefix.trim())
        return NextResponse.json({ ok: true })
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
}
