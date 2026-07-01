import { NextResponse } from "next/server"
import { getStorage } from "@/lib/storage"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Upload one or more files (multipart) into the given folder prefix. */
export async function POST(req: Request) {
    try {
        const form = await req.formData()
        const prefix = String(form.get("prefix") ?? "")
        const files = form.getAll("files").filter((f): f is File => f instanceof File)
        if (files.length === 0) return NextResponse.json({ error: "no files" }, { status: 400 })

        const storage = getStorage()
        const base = prefix ? prefix.replace(/\/?$/, "/") : ""
        const uploaded = []
        for (const file of files) {
            const key = base + file.name
            const buf = Buffer.from(await file.arrayBuffer())
            uploaded.push(await storage.upload(key, buf, file.type || undefined))
        }
        return NextResponse.json({ ok: true, uploaded })
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
}
