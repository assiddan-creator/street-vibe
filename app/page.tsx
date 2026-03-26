"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MicButton } from "@/components/MicButton";
import { DialectSelector } from "@/components/DialectSelector";
import { TranslationOutput } from "@/components/TranslationOutput";
import { DuoMode } from "@/components/DuoMode";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { DEFAULT_DIALECT_VALUE } from "@/lib/dialects";

type ViewMode = "standard" | "duo";

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("standard");
  const [dialect, setDialect] = useState(DEFAULT_DIALECT_VALUE);
  const [inputText, setInputText] = useState("");
  const [duoMy, setDuoMy] = useState("");
  const [duoTheir, setDuoTheir] = useState("");
  const [translation, setTranslation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDuoTurnRef = useRef<"my" | "their" | null>(null);
  const [activeDuoTurn, setActiveDuoTurn] = useState<"my" | "their" | null>(null);

  const onFinal = useCallback((text: string) => {
    const chunk = text.trim();
    if (!chunk) return;
    if (viewMode !== "duo") {
      setInputText((prev) => (prev ? `${prev} ${chunk}` : chunk));
      return;
    }
    const turn = activeDuoTurnRef.current;
    if (turn === "my") setDuoMy((prev) => (prev ? `${prev} ${chunk}` : chunk));
    else if (turn === "their") setDuoTheir((prev) => (prev ? `${prev} ${chunk}` : chunk));
  }, [viewMode]);

  const { supported, listening, error: speechError, start, stop } = useSpeechRecognition({
    onFinal,
  });

  useEffect(() => {
    if (viewMode === "standard") {
      activeDuoTurnRef.current = null;
      setActiveDuoTurn(null);
    }
  }, [viewMode]);

  const handleMicPress = () => {
    if (listening) stop();
    else start();
  };

  const runDuoToggle = (turn: "my" | "their") => {
    if (activeDuoTurn === turn && listening) {
      stop();
      activeDuoTurnRef.current = null;
      setActiveDuoTurn(null);
      return;
    }
    activeDuoTurnRef.current = turn;
    setActiveDuoTurn(turn);
    if (listening) {
      stop();
      setTimeout(() => start(), 120);
    } else {
      start();
    }
  };

  const translate = async () => {
    const text =
      viewMode === "duo"
        ? [duoMy.trim(), duoTheir.trim()].filter(Boolean).join("\n---\n")
        : inputText.trim();
    if (!text) {
      setError("Add some text to translate.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          currentLang: dialect,
          translationMode: "standard",
          slangLevel: 2,
          context: "default",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Translation failed");
      setTranslation(data.fullText || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Street Vibe</h1>
          <p className="mt-1 text-sm text-zinc-400">Translate with local flavor — App Router scaffold.</p>
        </header>

        <div className="flex gap-2 rounded-lg bg-zinc-900/80 p-1">
          <button
            type="button"
            onClick={() => {
              if (listening) stop();
              setViewMode("standard");
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              viewMode === "standard" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => {
              if (listening) stop();
              setViewMode("duo");
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              viewMode === "duo" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Duo
          </button>
        </div>

        <DialectSelector value={dialect} onChange={setDialect} />

        {viewMode === "standard" ? (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">Input</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Speak or type your message…"
              rows={4}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <div className="flex items-center gap-3">
              <MicButton
                listening={listening}
                supported={supported}
                onPress={handleMicPress}
              />
              {speechError && <span className="text-xs text-amber-400">{speechError}</span>}
              {!supported && (
                <span className="text-xs text-zinc-500">Speech recognition not supported.</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <DuoMode
              activeTurn={activeDuoTurn}
              onToggleMy={() => runDuoToggle("my")}
              onToggleTheir={() => runDuoToggle("their")}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-emerald-600/90">My side</p>
                <textarea
                  value={duoMy}
                  onChange={(e) => setDuoMy(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-sky-600/90">Their side</p>
                <textarea
                  value={duoTheir}
                  onChange={(e) => setDuoTheir(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-700"
                />
              </div>
            </div>
            {speechError && <p className="text-xs text-amber-400">{speechError}</p>}
          </div>
        )}

        <button
          type="button"
          onClick={translate}
          disabled={loading}
          className="rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
        >
          {loading ? "Translating…" : "Translate"}
        </button>

        {(error || null) && <p className="text-sm text-red-400">{error}</p>}

        <TranslationOutput text={translation} />
      </div>
    </div>
  );
}
