"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/state/store";
import { MOCK_PRODUCTS, MOCK_EVENTS } from "@/lib/mock/products";
import type { EventType } from "@/lib/types";

const CACHE_TTL_MS = 60_000;

export interface DateRange {
  from: number; // epoch ms
  to: number;
}

export interface DashboardStats {
  totalProducts: number;
  totalEvents: number;
  activeProducts: number;
  recentActivity: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface EventTypeCount {
  name: EventType;
  value: number;
}

/** Average hours between consecutive events of a given stage across all products */
export interface ProcessingTime {
  stage: EventType;
  avgHours: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  count: number;
}

export interface ActorActivity {
  actor: string; // truncated address
  count: number;
}

export function useDashboardData(range?: DateRange) {
  const { products, events, lastFetched, setProducts, setEvents, setLastFetched } =
    useStore();

  useEffect(() => {
    const now = Date.now();
    if (lastFetched && now - lastFetched < CACHE_TTL_MS) return;
    setProducts(MOCK_PRODUCTS);
    setEvents(MOCK_EVENTS);
    setLastFetched(now);
  }, [lastFetched, setProducts, setEvents, setLastFetched]);

  const now = Date.now();
  const from = range?.from ?? 0;
  const to = range?.to ?? now;

  const filteredEvents = events.filter((e) => e.timestamp >= from && e.timestamp <= to);

  const stats: DashboardStats = {
    totalProducts: products.length,
    totalEvents: filteredEvents.length,
    activeProducts: products.filter((p) => p.active).length,
    recentActivity: events.filter((e) => e.timestamp > now - 86_400_000).length,
  };

  // Events per day over the range (max 90 buckets)
  const rangeDays = Math.min(90, Math.ceil((to - from) / 86_400_000) || 30);
  const dailyCounts: DailyCount[] = Array.from({ length: rangeDays }, (_, i) => {
    const d = new Date(to - (rangeDays - 1 - i) * 86_400_000);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 86_400_000;
    return {
      date: label,
      count: filteredEvents.filter((e) => e.timestamp >= dayStart && e.timestamp < dayEnd).length,
    };
  });

  // Event type distribution
  const typeMap: Record<EventType, number> = { HARVEST: 0, PROCESSING: 0, SHIPPING: 0, RETAIL: 0 };
  for (const e of filteredEvents) typeMap[e.eventType] = (typeMap[e.eventType] ?? 0) + 1;
  const eventTypeCounts: EventTypeCount[] = (
    Object.entries(typeMap) as [EventType, number][]
  ).map(([name, value]) => ({ name, value }));

  // Average processing time per stage (hours between consecutive events on same product)
  const STAGES: EventType[] = ["HARVEST", "PROCESSING", "SHIPPING", "RETAIL"];
  const processingTimes: ProcessingTime[] = STAGES.map((stage) => {
    const stageEvents = filteredEvents
      .filter((e) => e.eventType === stage)
      .sort((a, b) => a.timestamp - b.timestamp);
    if (stageEvents.length < 2) return { stage, avgHours: 0 };
    const gaps: number[] = [];
    for (let i = 1; i < stageEvents.length; i++) {
      gaps.push((stageEvents[i].timestamp - stageEvents[i - 1].timestamp) / 3_600_000);
    }
    const avg = gaps.reduce((s, v) => s + v, 0) / gaps.length;
    return { stage, avgHours: Math.round(avg * 10) / 10 };
  });

  // Top 10 products by event count
  const productEventMap = new Map<string, number>();
  for (const e of filteredEvents) {
    productEventMap.set(e.productId, (productEventMap.get(e.productId) ?? 0) + 1);
  }
  const topProducts: TopProduct[] = [...productEventMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([productId, count]) => ({
      productId,
      name: products.find((p) => p.id === productId)?.name ?? productId,
      count,
    }));

  // Actor leaderboard (top 10 by event count)
  const actorMap = new Map<string, number>();
  for (const e of filteredEvents) {
    actorMap.set(e.actor, (actorMap.get(e.actor) ?? 0) + 1);
  }
  const actorLeaderboard: ActorActivity[] = [...actorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([actor, count]) => ({
      actor: `${actor.slice(0, 6)}…${actor.slice(-4)}`,
      count,
    }));

  const recentEvents = [...filteredEvents]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  return {
    stats,
    dailyCounts,
    eventTypeCounts,
    processingTimes,
    topProducts,
    actorLeaderboard,
    recentEvents,
    filteredEvents,
  };
}
