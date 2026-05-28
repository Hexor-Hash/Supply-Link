"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Upload, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { registerProduct } from "@/lib/stellar/client";
import { useStore } from "@/lib/state/store";

interface CsvRow {
  id: string;
  name: string;
  origin: string;
}

type RowStatus = "pending" | "running" | "success" | "error";

interface RowResult extends CsvRow {
  status: RowStatus;
  error?: string;
}

function validateRow(row: Record<string, string>, index: number): string | null {
  if (!row.id?.trim()) return `Row ${index + 1}: missing id`;
  if (!row.name?.trim() || row.name.trim().length < 2) return `Row ${index + 1}: name must be ≥ 2 chars`;
  if (!row.origin?.trim() || row.origin.trim().length < 2) return `Row ${index + 1}: origin must be ≥ 2 chars`;
  return null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BatchImportForm({ open, onOpenChange }: Props) {
  const { walletAddress, addProduct } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<RowResult[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const processed = rows.filter((r) => r.status === "success" || r.status === "error").length;
  const progress = rows.length > 0 ? Math.round((processed / rows.length) * 100) : 0;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setDone(false);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(result) {
        const validationErrors: string[] = [];
        const parsed: RowResult[] = result.data.map((raw, i) => {
          const err = validateRow(raw, i);
          if (err) validationErrors.push(err);
          return {
            id: raw.id?.trim() ?? "",
            name: raw.name?.trim() ?? "",
            origin: raw.origin?.trim() ?? "",
            status: err ? "error" : "pending",
            error: err ?? undefined,
          };
        });

        if (result.errors.length > 0) {
          setParseError(`CSV parse error: ${result.errors[0].message}`);
          return;
        }
        setRows(parsed);
      },
      error(err) {
        setParseError(err.message);
      },
    });
  }

  async function handleSubmit() {
    if (!walletAddress) return;
    setRunning(true);

    for (let i = 0; i < rows.length; i++) {
      if (rows[i].status !== "pending") continue;

      setRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "running" } : r))
      );

      try {
        await registerProduct(rows[i].id, rows[i].name, rows[i].origin, "", walletAddress);
        addProduct({
          id: rows[i].id,
          name: rows[i].name,
          origin: rows[i].origin,
          owner: walletAddress,
          timestamp: Date.now(),
          active: true,
          authorizedActors: [walletAddress],
        });
        setRows((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "success" } : r))
        );
      } catch (err) {
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, status: "error", error: err instanceof Error ? err.message : "Unknown error" }
              : r
          )
        );
      }
    }

    setRunning(false);
    setDone(true);
  }

  function handleClose(open: boolean) {
    if (!running) {
      setRows([]);
      setParseError(null);
      setDone(false);
      if (fileRef.current) fileRef.current.value = "";
      onOpenChange(open);
    }
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const canSubmit = !running && pendingCount > 0 && !!walletAddress;

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-[var(--background)] border border-[var(--card-border)] rounded-2xl p-6 shadow-xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">Batch Import Products</Dialog.Title>
            <Dialog.Close
              disabled={running}
              className="p-1 rounded-lg hover:bg-[var(--muted-bg)] transition-colors disabled:opacity-40"
            >
              <X size={18} />
            </Dialog.Close>
          </div>

          <p className="text-sm text-[var(--muted)]">
            Upload a CSV with columns: <code className="font-mono text-xs bg-[var(--muted-bg)] px-1 py-0.5 rounded">id, name, origin</code>
          </p>

          {/* File input */}
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--card-border)] rounded-xl p-6 cursor-pointer hover:border-violet-500 transition-colors">
            <Upload size={24} className="text-[var(--muted)]" />
            <span className="text-sm text-[var(--muted)]">Click to select a CSV file</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
              disabled={running}
            />
          </label>

          {parseError && (
            <p className="text-sm text-red-500">{parseError}</p>
          )}

          {/* Progress bar */}
          {rows.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-[var(--muted)]">
                <span>{processed} / {rows.length} processed</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--muted-bg)] overflow-hidden">
                <div
                  className="h-full bg-violet-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Row results */}
          {rows.length > 0 && (
            <ul className="flex flex-col gap-1 max-h-56 overflow-y-auto text-sm">
              {rows.map((row, i) => (
                <li key={i} className="flex items-start gap-2 py-1 border-b border-[var(--card-border)] last:border-0">
                  <span className="mt-0.5 shrink-0">
                    {row.status === "success" && <CheckCircle size={15} className="text-green-500" />}
                    {row.status === "error" && <XCircle size={15} className="text-red-500" />}
                    {row.status === "running" && <Loader2 size={15} className="text-violet-500 animate-spin" />}
                    {row.status === "pending" && <span className="inline-block w-[15px] h-[15px] rounded-full border border-[var(--muted)]" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="font-medium">{row.name}</span>
                    <span className="text-[var(--muted)] ml-1 font-mono text-xs">({row.id})</span>
                    {row.error && <span className="block text-xs text-red-500 truncate">{row.error}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-3 mt-1">
            <Dialog.Close
              disabled={running}
              className="flex-1 px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm font-medium hover:bg-[var(--muted-bg)] transition-colors disabled:opacity-40"
            >
              {done ? "Close" : "Cancel"}
            </Dialog.Close>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? "Importing…" : `Import ${pendingCount > 0 ? pendingCount : ""} Product${pendingCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
