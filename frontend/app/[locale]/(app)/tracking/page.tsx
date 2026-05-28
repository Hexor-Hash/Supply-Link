"use client";

import { useState, type ChangeEvent } from "react";
import { Plus, List, BarChart2, RefreshCw, Download } from "lucide-react";
import { exportToCSV, exportToJSON } from "@/lib/utils/export";
import { MOCK_PRODUCTS } from "@/lib/mock/products";
import type { TrackingEvent } from "@/lib/types";
import { useEvents } from "@/lib/hooks/useEvents";
import { EventTimeline } from "@/components/tracking/EventTimeline";
import { EventTimelineSkeleton } from "@/components/tracking/EventTimelineSkeleton";
import { AddEventModal } from "@/components/tracking/AddEventModal";
import { TimelineChart } from "@/components/tracking/TimelineChart";
import { LazyEventMap } from "@/components/lazy/LazyEventMap";

export default function TrackingPage() {
  const [selectedId, setSelectedId] = useState(MOCK_PRODUCTS[0]?.id ?? "");
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<"list" | "chart" | "map">("list");

  const { events: allEvents, loading, error, refresh, addEventOptimistic } = useEvents();

  const events = allEvents.filter((e) => e.productId === selectedId);

  function handleAddEvent(event: TrackingEvent) {
    addEventOptimistic(
      event,
      async () => {
        // Replace with real Soroban contract call
        await new Promise((r) => setTimeout(r, 1000));
      },
      (msg) => console.error("Add event failed:", msg)
    );
  }

  const selectedProduct = MOCK_PRODUCTS.find((p) => p.id === selectedId);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Tracking</h1>
        <div className="flex gap-2">
          {/* Refresh button (#48) */}
          <button
            onClick={refresh}
            title="Refresh events"
            className="flex items-center gap-2 px-3 py-2.5 border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--muted-bg)] rounded-lg text-sm transition-colors min-h-[44px]"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => exportToCSV(events, `events-${selectedId}.csv`)}
            disabled={events.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--muted-bg)] rounded-lg text-sm transition-colors min-h-[44px] disabled:opacity-40"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={() => exportToJSON(events, `events-${selectedId}.json`)}
            disabled={events.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--muted-bg)] rounded-lg text-sm transition-colors min-h-[44px] disabled:opacity-40"
          >
            <Download size={15} /> Export JSON
          </button>
          <button
            onClick={() => setShowModal(true)}
            disabled={!selectedId}
            className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-md bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90 disabled:opacity-40 transition-opacity min-h-[44px]"
          >
            <Plus size={15} />
            Add Event
          </button>
        </div>
      </div>

      {/* Error banner (#47) */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Product selector */}
      <div className="mb-6">
        <label className="text-xs text-[var(--muted)] mb-1.5 block">Select Product</label>
        <select
          value={selectedId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedId(e.target.value)}
          className="w-full border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          {MOCK_PRODUCTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.id}
            </option>
          ))}
        </select>
      </div>

      {/* Product summary */}
      {selectedProduct && (
        <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">{selectedProduct.name}</p>
            <p className="text-xs text-[var(--muted)]">Origin: {selectedProduct.origin}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedProduct.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {selectedProduct.active ? "Active" : "Inactive"}
          </span>
        </div>
      )}

      {/* Timeline */}
      <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Event History
            {!loading && <span className="ml-2 text-[var(--muted)] font-normal">({events.length})</span>}
          </h2>
          <div className="flex items-center gap-1 border border-[var(--card-border)] rounded-lg p-0.5">
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-violet-600 text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              title="List view"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setView("chart")}
              className={`p-1.5 rounded-md transition-colors ${view === "chart" ? "bg-violet-600 text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              title="Chart view"
            >
              <BarChart2 size={14} />
            </button>
            <button
              onClick={() => setView("map")}
              className={`p-1.5 rounded-md transition-colors ${view === "map" ? "bg-violet-600 text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              title="Map view"
            >
              <Map size={14} />
            </button>
          </div>
        </div>
        {loading ? (
          <EventTimelineSkeleton />
        ) : view === "list" ? (
          <EventTimeline events={events} />
        ) : view === "chart" ? (
          <TimelineChart events={events} />
        ) : (
          <LazyEventMap events={events} />
        )}
      </div>

      {showModal && selectedId && (
        <AddEventModal
          productId={selectedId}
          onClose={() => setShowModal(false)}
          onAdd={handleAddEvent}
        />
      )}
    </div>
  );
}
