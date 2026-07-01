import { NextResponse } from "next/server"
import { getStorage } from "@/lib/storage"

export const dynamic = "force-dynamic"

/** Stream a file's bytes (auth-gated) for preview or download. */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    const download = searchParams.get("download") === "1"
    if (!path) return NextResponse.json({ error: "path required" }, { status: 400 })

    try {
        const { body, contentType, size } = await getStorage().read(path)
        const headers = new Headers()
        headers.set("Content-Type", contentType)
        if (size) headers.set("Content-Length", String(size))
        if (download) {
            const name = path.split("/").pop() || "download"
            headers.set("Content-Disposition", `attachment; filename="${name}"`)
        }
        return new Response(body, { headers })
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 404 })
    }
}
