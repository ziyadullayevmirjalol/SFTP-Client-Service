import { NextResponse } from "next/server"
import { getStorage } from "@/lib/storage"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const prefix = searchParams.get("prefix") ?? ""
    const cursor = searchParams.get("cursor") ?? undefined
    try {
        const storage = getStorage()
        const result = await storage.list(prefix, cursor)
        return NextResponse.json({ ...result, connection: { id: storage.id, label: storage.label } })
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
}
