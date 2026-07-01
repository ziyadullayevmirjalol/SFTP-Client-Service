"use client"

import { useEffect, useMemo, useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import ReactMarkdown from "react-markdown"
import { Download, FileQuestion, Loader2 } from "lucide-react"
import { fileKind, langOf, formatBytes } from "@/lib/format"

export interface PreviewFile {
    pathname: string
    name: string
    size: number
    contentType?: string
}

const TEXT_LIMIT = 2 * 1024 * 1024 // don't fetch >2MB as text

function contentUrl(path: string, download = false) {
    return `/api/fs/content?path=${encodeURIComponent(path)}${download ? "&download=1" : ""}`
}

export function Preview({ file }: { file: PreviewFile }) {
    const kind = fileKind(file.name, file.contentType)
    const textual = ["code", "json", "ndjson", "markdown", "text"].includes(kind)

    const [text, setText] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!textual) return
        if (file.size > TEXT_LIMIT) return
        let cancelled = false
        setLoading(true)
        setText(null)
        fetch(contentUrl(file.pathname))
            .then(r => r.text())
            .then(t => { if (!cancelled) setText(t) })
            .catch(() => { if (!cancelled) setText("") })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [file.pathname, file.size, textual])

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={file.name}>{file.name}</p>
                    <p className="text-xs text-muted">{formatBytes(file.size)} · {kind}</p>
                </div>
                <a
                    href={contentUrl(file.pathname, true)}
                    className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs hover:border-accent"
                >
                    <Download size={13} /> Download
                </a>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
                <Body file={file} kind={kind} textual={textual} text={text} loading={loading} />
            </div>
        </div>
    )
}

function Body({
    file, kind, textual, text, loading,
}: {
    file: PreviewFile
    kind: ReturnType<typeof fileKind>
    textual: boolean
    text: string | null
    loading: boolean
}) {
    const src = contentUrl(file.pathname)

    if (kind === "image") {
        // eslint-disable-next-line @next/next/no-img-element
        return <div className="flex items-center justify-center p-4"><img src={src} alt={file.name} className="max-h-full max-w-full rounded-md" /></div>
    }
    if (kind === "video") {
        return <div className="flex items-center justify-center p-4"><video src={src} controls className="max-h-full max-w-full rounded-md" /></div>
    }
    if (kind === "audio") {
        return <div className="flex items-center justify-center p-6"><audio src={src} controls className="w-full" /></div>
    }
    if (kind === "pdf") {
        return <iframe src={src} className="h-full w-full" title={file.name} />
    }

    if (textual) {
        if (file.size > TEXT_LIMIT) return <Fallback file={file} note="File too large to preview inline." />
        if (loading) return <Loading />
        if (text === null) return <Loading />
        if (kind === "ndjson") return <NdjsonTable text={text} />
        if (kind === "markdown") return (
            <div className="prose-invert max-w-none p-5 text-sm leading-relaxed [&_a]:text-accent [&_code]:rounded [&_code]:bg-panel-2 [&_code]:px-1 [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:font-semibold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5">
                <ReactMarkdown>{text}</ReactMarkdown>
            </div>
        )
        const code = kind === "json" ? safePrettyJson(text) : text
        return (
            <SyntaxHighlighter
                language={kind === "json" ? "json" : langOf(file.name)}
                style={oneDark}
                customStyle={{ margin: 0, background: "transparent", fontSize: 12.5, padding: "1rem" }}
                wrapLongLines
            >
                {code}
            </SyntaxHighlighter>
        )
    }

    return <Fallback file={file} note="No inline preview for this file type." />
}

function NdjsonTable({ text }: { text: string }) {
    const rows = useMemo(() => {
        return text
            .split("\n")
            .filter(l => l.trim().length > 0)
            .map(l => { try { return JSON.parse(l) as Record<string, unknown> } catch { return null } })
            .filter((r): r is Record<string, unknown> => r !== null)
    }, [text])

    const columns = useMemo(() => {
        const freq = new Map<string, number>()
        for (const r of rows) for (const k of Object.keys(r)) freq.set(k, (freq.get(k) ?? 0) + 1)
        return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k)
    }, [rows])

    if (rows.length === 0) return <Loading />

    return (
        <div className="overflow-auto">
            <p className="px-4 py-2 text-xs text-muted">{rows.length.toLocaleString()} records</p>
            <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-panel-2">
                    <tr>{columns.map(c => <th key={c} className="border-b border-border px-3 py-2 text-left font-medium text-muted">{c}</th>)}</tr>
                </thead>
                <tbody className="font-mono">
                    {rows.slice(0, 500).map((r, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-panel-2/50">
                            {columns.map(c => (
                                <td key={c} className="max-w-xs truncate px-3 py-1.5" title={cell(r[c])}>{cell(r[c])}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function cell(v: unknown): string {
    if (v === null || v === undefined) return ""
    if (typeof v === "object") return JSON.stringify(v)
    return String(v)
}

function safePrettyJson(text: string): string {
    try { return JSON.stringify(JSON.parse(text), null, 2) } catch { return text }
}

function Loading() {
    return <div className="flex h-full items-center justify-center text-muted"><Loader2 size={18} className="animate-spin" /></div>
}

function Fallback({ file, note }: { file: PreviewFile; note: string }) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted">
            <FileQuestion size={40} strokeWidth={1.3} />
            <p className="text-sm">{note}</p>
            <a
                href={contentUrl(file.pathname, true)}
                className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-3 py-1.5 text-xs text-foreground hover:border-accent"
            >
                <Download size={13} /> Download {file.name}
            </a>
        </div>
    )
}
