"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  blockMatch,
  getCurrentAccount,
  listMatchMessages,
  listMyMatches,
  sendMatchMessage,
  unmatch,
} from "@/lib/matrimony";

export default function MessagesPage() {
  const [accountId, setAccountId] = useState("");
  const [matches, setMatches] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("Loading chats...");

  const active = useMemo(() => matches.find((m) => m.id === activeId) ?? null, [matches, activeId]);

  async function loadMatches() {
    const all = (await listMyMatches()) as any[];
    setMatches(all);
    if (!activeId && all[0]?.id) setActiveId(all[0].id);
    if (!all.length) setMsg("No active matches yet. Mutual likes will appear here.");
    else setMsg("");
  }

  async function loadMessages(matchId: string) {
    const list = await listMatchMessages(matchId);
    setMessages(list);
  }

  useEffect(() => {
    (async () => {
      try {
        const me = await getCurrentAccount();
        setAccountId(me.accountId);
        await loadMatches();
      } catch {
        setMsg("Please login to access messages.");
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId).catch(() => setMsg("Unable to load messages."));
  }, [activeId]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!active) return;

    setBusy(true);
    try {
      await sendMatchMessage(active, input);
      setInput("");
      await loadMessages(active.id);
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to send message.");
    } finally {
      setBusy(false);
    }
  }

  async function onUnmatch() {
    if (!active) return;
    setBusy(true);
    try {
      await unmatch(active.id);
      setActiveId("");
      setMessages([]);
      await loadMatches();
      setMsg("Match removed.");
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to unmatch.");
    } finally {
      setBusy(false);
    }
  }

  async function onBlock() {
    if (!active) return;
    setBusy(true);
    try {
      await blockMatch(active.id);
      setActiveId("");
      setMessages([]);
      await loadMatches();
      setMsg("Profile blocked.");
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to block.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="section mt-10 mb-12">
      <h1 className="text-3xl font-extrabold text-pink-800">Messages</h1>
      <p className="mt-2 text-lg text-slate-600">Mutual likes appear here. You can chat, unmatch, or block.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-[28px] border border-pink-100 bg-white/85 p-4 shadow-sm">
          <h2 className="px-2 pb-3 text-sm font-bold tracking-wide text-slate-500 uppercase">Matches</h2>
          <div className="space-y-3">
            {matches.map((match) => (
              <button
                key={match.id}
                onClick={() => setActiveId(match.id)}
                className={`w-full rounded-2xl border p-3 text-left ${
                  match.id === activeId
                    ? "border-pink-300 bg-pink-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full border border-pink-100 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={match.photo || "/next.svg"} alt={match.otherProfile?.fullName || "Match"} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{match.otherProfile?.fullName || "Member"}</p>
                    <p className="truncate text-xs text-slate-500">{match.lastMessage?.content || "No messages yet"}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-[28px] border border-pink-100 bg-white/90 p-5 shadow-sm">
          {!active ? (
            <p className="text-sm text-slate-600">Select a match to start chatting.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-100 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-pink-900">{active.otherProfile?.fullName || "Member"}</h2>
                  <p className="text-sm text-slate-600">
                    {active.otherProfile?.city || "Unknown city"}, {active.otherProfile?.country || "Unknown country"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Phone: {active.canSeePhone ? active.otherProfile?.phone : "Hidden until both users share number"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button onClick={onUnmatch} disabled={busy} className="btn-outline text-sm">Unmatch</button>
                  <button onClick={onBlock} disabled={busy} className="btn-primary text-sm">Block</button>
                </div>
              </div>

              <div className="mt-4 h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {messages.map((m) => {
                  const mine = m.senderUserId === accountId;
                  return (
                    <div key={m.id} className={`mb-2 flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-pink-600 text-white" : "bg-white text-slate-800 border border-slate-200"}`}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form className="mt-4 flex gap-2" onSubmit={onSend}>
                <input
                  className="input"
                  placeholder="Type your message"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button disabled={busy} className="btn-primary">Send</button>
              </form>
            </>
          )}
        </section>
      </div>

      {msg && <p className="mt-4 text-sm font-semibold text-pink-700">{msg}</p>}
    </main>
  );
}
