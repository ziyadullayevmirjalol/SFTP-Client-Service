export function formatBytes(n: number): string {
    if (!n) return "0 B"
    const units = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(n) / Math.log(1024))
    return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDate(iso: string): string {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
}

export type FileKind =
    | "image" | "pdf" | "video" | "audio" | "code" | "json" | "ndjson" | "markdown" | "text" | "other"

const EXT: Record<string, FileKind> = {
    png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image", avif: "image", bmp: "image", ico: "image",
    pdf: "pdf",
    mp4: "video", webm: "video", mov: "video", mkv: "video",
    mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio", flac: "audio",
    json: "json",
    ndjson: "ndjson", jsonl: "ndjson",
    md: "markdown", markdown: "markdown",
    ts: "code", tsx: "code", js: "code", jsx: "code", mjs: "code", cjs: "code",
    css: "code", scss: "code", html: "code", xml: "code", yml: "code", yaml: "code",
    py: "code", go: "code", rs: "code", java: "code", rb: "code", php: "code", sh: "code", sql: "code", toml: "code",
    txt: "text", log: "text", env: "text", csv: "text", conf: "text", ini: "text",
}

export function extOf(name: string): string {
    const i = name.lastIndexOf(".")
    return i === -1 ? "" : name.slice(i + 1).toLowerCase()
}

export function fileKind(name: string, contentType?: string): FileKind {
    const byExt = EXT[extOf(name)]
    if (byExt) return byExt
    if (contentType) {
        if (contentType.startsWith("image/")) return "image"
        if (contentType.startsWith("video/")) return "video"
        if (contentType.startsWith("audio/")) return "audio"
        if (contentType === "application/pdf") return "pdf"
        if (contentType.includes("json")) return "json"
        if (contentType.startsWith("text/")) return "text"
    }
    return "other"
}

/** react-syntax-highlighter language id from a filename. */
export function langOf(name: string): string {
    const e = extOf(name)
    const map: Record<string, string> = {
        ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx", mjs: "javascript", cjs: "javascript",
        py: "python", rb: "ruby", go: "go", rs: "rust", java: "java", php: "php", sh: "bash",
        css: "css", scss: "scss", html: "markup", xml: "markup", svg: "markup",
        yml: "yaml", yaml: "yaml", sql: "sql", toml: "toml", json: "json", md: "markdown",
    }
    return map[e] ?? "text"
}

/** Last path segment of a folder prefix like "logs/production/" → "production". */
export function folderName(prefix: string): string {
    const t = prefix.replace(/\/+$/, "")
    return t.slice(t.lastIndexOf("/") + 1)
}
