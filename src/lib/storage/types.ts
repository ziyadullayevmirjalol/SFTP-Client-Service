/**
 * Storage provider abstraction. The app talks only to this interface; Vercel Blob is the
 * first implementation. New backends (S3, R2, SFTP…) are added by implementing this and
 * wiring them into `getStorage()` — the UI and API routes never change.
 */

export interface FileEntry {
    /** Full object key, e.g. "logs/production/audit/2026/07/01/x.ndjson". */
    pathname: string
    /** Basename, e.g. "x.ndjson". */
    name: string
    size: number
    /** ISO-8601. */
    uploadedAt: string
    contentType?: string
    /** Access URL (used by the content proxy). */
    url: string
}

export interface ListResult {
    /** The prefix that was listed (a "folder"), "" for root. */
    prefix: string
    /** Sub-folder prefixes directly under `prefix`, e.g. "logs/production/". */
    folders: string[]
    /** Files directly under `prefix`. */
    files: FileEntry[]
    cursor?: string
    hasMore: boolean
}

export interface StorageProvider {
    /** Stable id + human label for the active connection (shown in the header). */
    readonly id: string
    readonly label: string
    /** List one folder level (folded) under `prefix`. */
    list(prefix: string, cursor?: string): Promise<ListResult>
    /** Every object key under `prefix`, recursively (used for folder delete/rename). */
    listAllKeys(prefix: string): Promise<string[]>
    /** Metadata for a single object, or null if missing. */
    head(pathname: string): Promise<FileEntry | null>
    /** Fetch raw bytes for preview/download (streamed by the content proxy). */
    read(pathname: string): Promise<{ body: ReadableStream | null; contentType: string; size: number }>
    /** Create or overwrite an object. */
    upload(pathname: string, body: ArrayBuffer | Buffer | string, contentType?: string): Promise<FileEntry>
    /** Delete one or more objects. */
    delete(pathnames: string[]): Promise<void>
    /** Rename/move (copy then delete the source). */
    move(from: string, to: string): Promise<FileEntry>
    /** Create an empty folder (a hidden placeholder object so it appears in listings). */
    createFolder(prefix: string): Promise<void>
}

/** Placeholder object name that materializes an otherwise-empty folder. Hidden in the UI. */
export const FOLDER_PLACEHOLDER = ".keep"
