"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
    Folder, File as FileIcon, Upload, FolderPlus, RefreshCw, Trash2, Download,
    Pencil, ChevronRight, LogOut, Database, Loader2, HardDrive, X,
} from "lucide-react"
import { formatBytes, formatDate, folderName } from "@/lib/format"
import { Preview, type PreviewFile } from "./preview"

interface FileEntry { pathname: string; name: string; size: number; uploadedAt: string; url: string; contentType?: string }
interface ListResult { prefix: string; folders: string[]; files: FileEntry[]; cursor?: string; hasMore: boolean; connection?: { id: string; label: string } }

function dirOf(pathname: string): string {
    const i = pathname.lastIndexOf("/")
    return i === -1 ? "" : pathname.slice(0, i + 1)
}
function contentUrl(path: string, download = false) {
    return `/api/fs/content?path=${encodeURIComponent(path)}${download ? "&download=1" : ""}`
}

export function FileManager({ username }: { username: string }) {
    const router = useRouter()
    const [prefix, setPrefix] = useState("")
    const [data, setData] = useState<ListResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [preview, setPreview] = useState<PreviewFile | null>(null)
    const [busy, setBusy] = useState(false)
    const fileInput = useRef<HTMLInputElement>(null)

    const load = useCallback(async (p: string) => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/fs/list?prefix=${encodeURIComponent(p)}`)
            if (!res.ok) throw new Error((await res.json()).error || "Failed to list")
            setData(await res.json())
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load(prefix) }, [prefix, load])

    function navigate(p: string) {
        setSelected(new Set())
        setPreview(null)
        setPrefix(p)
    }

    async function mutate(fn: () => Promise<Response>) {
        setBusy(true)
        try {
            const res = await fn()
            if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || "Operation failed") }
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e))
        } finally {
            setBusy(false)
            setSelected(new Set())
            await load(prefix)
        }
    }

    function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (!files || files.length === 0) return
        const form = new FormData()
        form.append("prefix", prefix)
        for (const f of Array.from(files)) form.append("files", f)
        mutate(() => fetch("/api/fs/upload", { method: "POST", body: form }))
        e.target.value = ""
    }
    function newFolder() {
        const name = window.prompt("New folder name")?.trim()
        if (!name) return
        mutate(() => fetch("/api/fs/mkdir", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prefix: prefix + name }),
        }))
    }
    function rename(entry: { pathname: string; name: string; isFolder: boolean }) {
        const current = entry.isFolder ? folderName(entry.pathname) : entry.name
        const next = window.prompt("Rename to", current)?.trim()
        if (!next || next === current) return
        const from = entry.pathname
        const to = entry.isFolder ? `${dirOf(from.replace(/\/$/, ""))}${next}/` : `${dirOf(from)}${next}`
        mutate(() => fetch("/api/fs/move", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ from, to }),
        }))
    }
    function del(pathnames: string[]) {
        if (pathnames.length === 0) return
        if (!window.confirm(`Delete ${pathnames.length} item(s)? This cannot be undone.`)) return
        if (preview && pathnames.includes(preview.pathname)) setPreview(null)
        mutate(() => fetch("/api/fs/delete", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pathnames }),
        }))
    }
    async function logout() {
        await fetch("/api/auth/logout", { method: "POST" })
        router.replace("/login")
        router.refresh()
    }

    function toggle(pathname: string) {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(pathname)) next.delete(pathname); else next.add(pathname)
            return next
        })
    }

    const crumbs = prefix.split("/").filter(Boolean)

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-border bg-panel px-4 py-2.5">
                <div className="flex items-center gap-2">
                    <HardDrive size={16} className="text-accent" />
                    <span className="text-sm font-semibold tracking-tight">Blob Manager</span>
                    <span className="ml-2 flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-muted">
                        <Database size={12} /> {data?.connection?.label ?? "…"}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">{username}</span>
                    <button onClick={logout} className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs hover:border-accent">
                        <LogOut size={13} /> Sign out
                    </button>
                </div>
            </header>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-panel/60 px-4 py-2">
                <nav className="flex items-center gap-1 text-sm">
                    <button onClick={() => navigate("")} className="rounded px-1.5 py-0.5 text-muted hover:text-foreground">root</button>
                    {crumbs.map((c, i) => {
                        const p = crumbs.slice(0, i + 1).join("/") + "/"
                        return (
                            <span key={p} className="flex items-center gap-1">
                                <ChevronRight size={13} className="text-muted" />
                                <button onClick={() => navigate(p)} className="rounded px-1.5 py-0.5 hover:text-accent">{c}</button>
                            </span>
                        )
                    })}
                </nav>

                <div className="flex items-center gap-1.5">
                    {selected.size > 0 && (
                        <button onClick={() => del([...selected])} className="flex items-center gap-1.5 rounded-md border border-red-900/60 bg-red-950/30 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-950/60">
                            <Trash2 size={13} /> Delete ({selected.size})
                        </button>
                    )}
                    <button onClick={() => fileInput.current?.click()} className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs hover:border-accent">
                        <Upload size={13} /> Upload
                    </button>
                    <button onClick={newFolder} className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs hover:border-accent">
                        <FolderPlus size={13} /> New folder
                    </button>
                    <button onClick={() => load(prefix)} className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs hover:border-accent">
                        <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                    <input ref={fileInput} type="file" multiple hidden onChange={onUpload} />
                </div>
            </div>

            {/* Body: table + preview */}
            <div className="flex min-h-0 flex-1">
                <div className="min-h-0 flex-1 overflow-auto">
                    {error && <div className="m-4 rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">{error}</div>}
                    <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-panel text-xs text-muted">
                            <tr>
                                <th className="w-8 px-3 py-2"></th>
                                <th className="px-3 py-2 text-left font-medium">Name</th>
                                <th className="w-28 px-3 py-2 text-right font-medium">Size</th>
                                <th className="w-44 px-3 py-2 text-left font-medium">Modified</th>
                                <th className="w-24 px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && !data && (
                                <tr><td colSpan={5} className="px-4 py-16 text-center text-muted"><Loader2 className="mx-auto animate-spin" /></td></tr>
                            )}
                            {data && data.folders.length === 0 && data.files.length === 0 && !loading && (
                                <tr><td colSpan={5} className="px-4 py-16 text-center text-muted">Empty folder</td></tr>
                            )}
                            {data?.folders.map(f => (
                                <tr key={f} className="group border-b border-border/50 hover:bg-panel-2/40">
                                    <td className="px-3 py-2">
                                        <input type="checkbox" checked={selected.has(f)} onChange={() => toggle(f)} className="accent-accent" />
                                    </td>
                                    <td className="px-3 py-2">
                                        <button onClick={() => navigate(f)} className="flex items-center gap-2 text-left hover:text-accent">
                                            <Folder size={15} className="text-accent" /> {folderName(f)}
                                        </button>
                                    </td>
                                    <td className="px-3 py-2 text-right text-muted">—</td>
                                    <td className="px-3 py-2 text-muted">—</td>
                                    <td className="px-3 py-2">
                                        <RowActions
                                            onRename={() => rename({ pathname: f, name: folderName(f), isFolder: true })}
                                            onDelete={() => del([f])}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {data?.files.map(file => {
                                const active = preview?.pathname === file.pathname
                                return (
                                    <tr key={file.pathname} className={`group border-b border-border/50 hover:bg-panel-2/40 ${active ? "bg-panel-2/60" : ""}`}>
                                        <td className="px-3 py-2">
                                            <input type="checkbox" checked={selected.has(file.pathname)} onChange={() => toggle(file.pathname)} className="accent-accent" />
                                        </td>
                                        <td className="px-3 py-2">
                                            <button
                                                onClick={() => setPreview({ pathname: file.pathname, name: file.name, size: file.size, contentType: file.contentType })}
                                                className="flex items-center gap-2 text-left hover:text-accent"
                                            >
                                                <FileIcon size={15} className="text-muted" /> {file.name}
                                            </button>
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-xs text-muted">{formatBytes(file.size)}</td>
                                        <td className="px-3 py-2 font-mono text-xs text-muted">{formatDate(file.uploadedAt)}</td>
                                        <td className="px-3 py-2">
                                            <RowActions
                                                onDownload={() => window.open(contentUrl(file.pathname, true), "_blank")}
                                                onRename={() => rename({ pathname: file.pathname, name: file.name, isFolder: false })}
                                                onDelete={() => del([file.pathname])}
                                            />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {preview && (
                    <div className="flex min-h-0 w-[46%] max-w-2xl flex-col border-l border-border bg-panel">
                        <div className="flex items-center justify-end border-b border-border px-2 py-1">
                            <button onClick={() => setPreview(null)} className="rounded p-1 text-muted hover:text-foreground"><X size={15} /></button>
                        </div>
                        <div className="min-h-0 flex-1"><Preview file={preview} /></div>
                    </div>
                )}
            </div>

            {busy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-panel px-4 py-3 text-sm"><Loader2 className="animate-spin" size={16} /> Working…</div>
                </div>
            )}
        </div>
    )
}

function RowActions({ onDownload, onRename, onDelete }: { onDownload?: () => void; onRename?: () => void; onDelete?: () => void }) {
    return (
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onDownload && <button onClick={onDownload} title="Download" className="rounded p-1 text-muted hover:text-accent"><Download size={14} /></button>}
            {onRename && <button onClick={onRename} title="Rename" className="rounded p-1 text-muted hover:text-accent"><Pencil size={14} /></button>}
            {onDelete && <button onClick={onDelete} title="Delete" className="rounded p-1 text-muted hover:text-red-400"><Trash2 size={14} /></button>}
        </div>
    )
}
