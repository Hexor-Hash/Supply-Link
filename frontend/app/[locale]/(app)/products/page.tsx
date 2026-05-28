"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, Plus, Package, ChevronDown, Upload, RefreshCw, Download } from "lucide-react";
import { exportToCSV, exportToJSON } from "@/lib/utils/export";
import * as Select from "@radix-ui/react-select";
import { useStore, selectFilteredProducts } from "@/lib/state/store";
import { useProducts } from "@/lib/hooks/useProducts";
import { RegisterProductForm } from "@/components/products/RegisterProductForm";
import { BatchImportForm } from "@/components/products/BatchImportForm";
import { CompareBar } from "@/components/products/CompareBar";
import ProductQRCode from "@/components/products/ProductQRCode";
import type { EventType } from "@/lib/types";
import { EVENT_TYPE_CONFIG } from "@/lib/eventTypeConfig";

const EVENT_TYPES: EventType[] = ["HARVEST", "PROCESSING", "SHIPPING", "RETAIL"];

function ProductSkeleton() {
  return (
    <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-6 flex flex-col gap-4 animate-pulse">
      <div className="h-5 bg-[var(--muted-bg)] rounded w-3/4" />
      <div className="h-4 bg-[var(--muted-bg)] rounded w-1/2" />
      <div className="h-3 bg-[var(--muted-bg)] rounded w-2/3" />
      <div className="w-40 h-40 bg-[var(--muted-bg)] rounded-lg" />
    </div>
  );
}

function EmptyState({ hasSearch, onRegister }: { hasSearch: boolean; onRegister: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-20 h-20 rounded-2xl bg-[var(--muted-bg)] flex items-center justify-center">
        <Package size={36} className="text-[var(--muted)]" />
      </div>
      <h3 className="text-lg font-semibold">
        {hasSearch ? "No products match your search" : "No products yet"}
      </h3>
      <p className="text-sm text-[var(--muted)] max-w-xs">
        {hasSearch ? "Try a different name or ID." : "Register your first product on-chain to get started."}
      </p>
      {!hasSearch && (
        <button
          onClick={onRegister}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors mt-2"
        >
          <Plus size={16} /> Register New Product
        </button>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const { loading, error, refresh } = useProducts();
  const {
    searchQuery,
    filterEventType,
    sortBy,
    sortOrder,
    compareIds,
    toggleCompare,
    setSearchQuery,
    setFilterEventType,
    setSortBy,
    setSortOrder,
  } = useStore();
  const filtered = useStore(selectFilteredProducts);
  const events = useStore((s) => s.events);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

  // Sync search + filter to/from URL params (#50)
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const q = searchParams.get("q");
    const f = searchParams.get("filter") as EventType | null;
    if (q !== null) setSearchQuery(q);
    if (f !== null) setFilterEventType(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateURL(q: string, f: EventType | null) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (f) params.set("filter", f);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleSearch(q: string) {
    setSearchQuery(q);
    updateURL(q, filterEventType);
  }

  function handleFilter(f: EventType | null) {
    setFilterEventType(f);
    updateURL(searchQuery, f);
  }

  return (
    <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Products</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {loading ? "Loading…" : `${filtered.length} product${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          {/* Refresh button — clears cache and re-fetches (#48) */}
          <button
            onClick={refresh}
            title="Refresh products"
            className="flex items-center gap-2 px-3 py-2.5 border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--muted-bg)] rounded-lg text-sm font-medium transition-colors min-h-[44px]"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => exportToCSV(events, "products-events.csv")}
            className="flex items-center gap-2 px-4 py-2.5 border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--muted-bg)] rounded-lg text-sm font-medium transition-colors min-h-[44px]"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => exportToJSON(events, "products-events.json")}
            className="flex items-center gap-2 px-4 py-2.5 border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--muted-bg)] rounded-lg text-sm font-medium transition-colors min-h-[44px]"
          >
            <Download size={16} /> Export JSON
          </button>
          <button
            onClick={() => setBatchOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--muted-bg)] rounded-lg text-sm font-medium transition-colors min-h-[44px]"
          >
            <Upload size={16} /> Import CSV
          </button>
          <button
            onClick={() => setRegisterOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]"
          >
            <Plus size={16} /> Register New Product
          </button>
        </div>
      </div>

      {/* Error banner (#47) */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Search + filter + sort (#50) */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search by name or ID…"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <Select.Root
          value={filterEventType ?? "ALL"}
          onValueChange={(v) => handleFilter(v === "ALL" ? null : (v as EventType))}
        >
          <Select.Trigger aria-label="Filter by event type" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-violet-500">
            <Select.Value placeholder="Filter by event" />
            <Select.Icon><ChevronDown size={14} /></Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="z-50 bg-[var(--background)] border border-[var(--card-border)] rounded-xl shadow-lg overflow-hidden">
              <Select.Viewport className="p-1">
                <Select.Item value="ALL" className="px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-[var(--muted-bg)] focus:bg-[var(--muted-bg)] outline-none">
                  <Select.ItemText>All Events</Select.ItemText>
                </Select.Item>
                {EVENT_TYPES.map((t) => {
                  const cfg = EVENT_TYPE_CONFIG[t];
                  const Icon = cfg.icon;
                  return (
                    <Select.Item key={t} value={t} className="px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-[var(--muted-bg)] focus:bg-[var(--muted-bg)] outline-none">
                      <Select.ItemText>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badgeClass}`}>
                          <Icon size={11} />
                          {cfg.label}
                        </span>
                      </Select.ItemText>
                    </Select.Item>
                  );
                })}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        <Select.Root
          value={`${sortBy}-${sortOrder}`}
          onValueChange={(v) => {
            const [by, order] = v.split("-") as ["name" | "timestamp", "asc" | "desc"];
            setSortBy(by);
            setSortOrder(order);
          }}
        >
          <Select.Trigger aria-label="Sort products" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-violet-500">
            <Select.Value placeholder="Sort" />
            <Select.Icon><ChevronDown size={14} /></Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="z-50 bg-[var(--background)] border border-[var(--card-border)] rounded-xl shadow-lg overflow-hidden">
              <Select.Viewport className="p-1">
                {(["name-asc", "name-desc", "timestamp-asc", "timestamp-desc"] as const).map((v) => (
                  <Select.Item key={v} value={v} className="px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-[var(--muted-bg)] focus:bg-[var(--muted-bg)] outline-none">
                    <Select.ItemText>
                      {v === "name-asc" ? "Name A→Z"
                        : v === "name-desc" ? "Name Z→A"
                        : v === "timestamp-asc" ? "Oldest first"
                        : "Newest first"}
                    </Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasSearch={searchQuery !== ""} onRegister={() => setRegisterOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => {
            const isSelected = compareIds.includes(product.id);
            return (
              <div key={product.id} className="relative group">
                {/* Compare checkbox */}
                <label
                  className="absolute top-3 right-3 z-10 flex items-center gap-1.5 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCompare(product.id)}
                    disabled={!isSelected && compareIds.length >= 4}
                    className="w-4 h-4 accent-violet-600 cursor-pointer"
                    aria-label={`Select ${product.name} for comparison`}
                  />
                  <span className="text-xs text-[var(--muted)] select-none hidden group-hover:inline">
                    Compare
                  </span>
                </label>

                <Link
                  href={`/products/${product.id}`}
                  className={`block border bg-[var(--card)] rounded-xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all ${
                    isSelected
                      ? "border-violet-500 ring-2 ring-violet-500/30"
                      : product.pending
                      ? "border-violet-400 animate-pulse"
                      : "border-[var(--card-border)] hover:border-violet-500/40"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 pr-6">
                      <h2 className="text-lg font-semibold text-[var(--foreground)] leading-tight">{product.name}</h2>
                      <div className="flex gap-1 shrink-0">
                        {product.pending && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-500/10 text-violet-500">
                            Pending
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${product.active ? "bg-green-500/10 text-green-500" : "bg-[var(--muted-bg)] text-[var(--muted)]"}`}>
                          {product.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--muted)] mt-1">Origin: {product.origin}</p>
                    <p className="text-xs text-[var(--muted)] mt-1 font-mono truncate">ID: {product.id}</p>
                  </div>
                  {product.imageUrl && (
                    <div className="relative w-full h-36 rounded-lg overflow-hidden">
                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                    </div>
                  )}
                  <ProductQRCode productId={product.id} size={160} />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <RegisterProductForm open={registerOpen} onOpenChange={setRegisterOpen} />
      <BatchImportForm open={batchOpen} onOpenChange={setBatchOpen} />
      <CompareBar />
    </main>
  );
}
