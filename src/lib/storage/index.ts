import { VercelBlobProvider } from "./vercel-blob"
import type { StorageProvider } from "./types"

export type { FileEntry, ListResult, StorageProvider } from "./types"

let cached: StorageProvider | null = null

/**
 * Build the active storage provider from env (single connection for now):
 *   STORAGE_PROVIDER   default "vercel-blob"
 *   STORAGE_LABEL      display name in the header
 *   BLOB_READ_WRITE_TOKEN   required for vercel-blob
 */
export function getStorage(): StorageProvider {
    if (cached) return cached

    const provider = (process.env.STORAGE_PROVIDER ?? "vercel-blob").toLowerCase()

    if (provider === "vercel-blob") {
        const token = process.env.BLOB_READ_WRITE_TOKEN
        if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not set")
        cached = new VercelBlobProvider(token, process.env.STORAGE_LABEL ?? "Vercel Blob")
        return cached
    }

    throw new Error(`Unknown STORAGE_PROVIDER: "${provider}"`)
}
