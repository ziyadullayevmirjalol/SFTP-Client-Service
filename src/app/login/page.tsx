"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Loader2 } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            })
            if (!res.ok) {
                setError("Invalid credentials")
                setBusy(false)
                return
            }
            router.replace("/")
            router.refresh()
        } catch {
            setError("Something went wrong")
            setBusy(false)
        }
    }

    return (
        <div className="flex min-h-full flex-1 items-center justify-center p-6">
            <form
                onSubmit={submit}
                className="w-full max-w-sm rounded-xl border border-border bg-panel p-7 shadow-2xl"
            >
                <div className="mb-6 flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-panel-2 border border-border">
                        <Lock size={16} className="text-accent" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold tracking-tight">Blob Manager</h1>
                        <p className="text-xs text-muted">Sign in to continue</p>
                    </div>
                </div>

                <label className="mb-1 block text-xs font-medium text-muted">Username</label>
                <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoFocus
                    autoComplete="username"
                    className="mb-4 w-full rounded-md border border-border bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />

                <label className="mb-1 block text-xs font-medium text-muted">Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="mb-5 w-full rounded-md border border-border bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />

                {error && (
                    <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                    {busy && <Loader2 size={14} className="animate-spin" />}
                    Sign in
                </button>
            </form>
        </div>
    )
}
