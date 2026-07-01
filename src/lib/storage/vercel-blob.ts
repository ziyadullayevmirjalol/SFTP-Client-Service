import { list, put, del, head, copy } from "@vercel/blob"
import {
    FOLDER_PLACEHOLDER,
    type FileEntry,
    type ListResult,
    type StorageProvider,
} from "./types"

/** Vercel Blob implementation of StorageProvider. Token stays server-side only. */
export class VercelBlobProvider implements StorageProvider {
    readonly id = "vercel-blob"
    readonly label: string
    private token: string

    constructor(token: string, label: string) {
        this.token = token
        this.label = label
    }

    private basename(pathname: string): string {
        const trimmed = pathname.replace(/\/+$/, "")
        return trimmed.slice(trimmed.lastIndexOf("/") + 1)
    }

    async list(prefix: string, cursor?: string): Promise<ListResult> {
        const res = await list({
            token: this.token,
            prefix: prefix || undefined,
            mode: "folded",
            cursor,
            limit: 1000,
        })

        const files: FileEntry[] = res.blobs
            .filter(b => this.basename(b.pathname) !== FOLDER_PLACEHOLDER) // hide folder markers
            .map(b => ({
                pathname: b.pathname,
                name: this.basename(b.pathname),
                size: b.size,
                uploadedAt: (b.uploadedAt instanceof Date ? b.uploadedAt.toISOString() : String(b.uploadedAt)),
                url: b.url,
            }))

        return {
            prefix,
            folders: res.folders ?? [],
            files,
            cursor: res.cursor,
            hasMore: res.hasMore,
        }
    }

    async listAllKeys(prefix: string): Promise<string[]> {
        const keys: string[] = []
        let cursor: string | undefined
        do {
            const res = await list({ token: this.token, prefix: prefix || undefined, cursor, limit: 1000 })
            for (const b of res.blobs) keys.push(b.pathname)
            cursor = res.hasMore ? res.cursor : undefined
        } while (cursor)
        return keys
    }

    async head(pathname: string): Promise<FileEntry | null> {
        try {
            const b = await head(pathname, { token: this.token })
            return {
                pathname: b.pathname,
                name: this.basename(b.pathname),
                size: b.size,
                uploadedAt: (b.uploadedAt instanceof Date ? b.uploadedAt.toISOString() : String(b.uploadedAt)),
                contentType: b.contentType,
                url: b.url,
            }
        } catch {
            return null
        }
    }

    async read(pathname: string): Promise<{ body: ReadableStream | null; contentType: string; size: number }> {
        const meta = await head(pathname, { token: this.token })
        const res = await fetch(meta.url, { cache: "no-store" })
        return {
            body: res.body,
            contentType: meta.contentType || res.headers.get("content-type") || "application/octet-stream",
            size: meta.size,
        }
    }

    async upload(
        pathname: string,
        body: ArrayBuffer | Buffer | string,
        contentType?: string
    ): Promise<FileEntry> {
        const b = await put(pathname, body as Buffer | string, {
            access: "public",
            token: this.token,
            contentType,
            addRandomSuffix: false,
            allowOverwrite: true,
        })
        return {
            pathname: b.pathname,
            name: this.basename(b.pathname),
            size: typeof body === "string" ? Buffer.byteLength(body) : (body as ArrayBuffer).byteLength ?? 0,
            uploadedAt: new Date().toISOString(),
            contentType,
            url: b.url,
        }
    }

    async delete(pathnames: string[]): Promise<void> {
        if (pathnames.length === 0) return
        await del(pathnames, { token: this.token })
    }

    async move(from: string, to: string): Promise<FileEntry> {
        const b = await copy(from, to, { access: "public", token: this.token, addRandomSuffix: false })
        await del(from, { token: this.token })
        return {
            pathname: b.pathname,
            name: this.basename(b.pathname),
            size: 0,
            uploadedAt: new Date().toISOString(),
            contentType: b.contentType,
            url: b.url,
        }
    }

    async createFolder(prefix: string): Promise<void> {
        const key = prefix.endsWith("/") ? `${prefix}${FOLDER_PLACEHOLDER}` : `${prefix}/${FOLDER_PLACEHOLDER}`
        await put(key, "", {
            access: "public",
            token: this.token,
            addRandomSuffix: false,
            allowOverwrite: true,
        })
    }
}
