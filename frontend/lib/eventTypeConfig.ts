import { Leaf, Cog, Truck, Store, type LucideIcon } from "lucide-react";
import type { EventType } from "@/lib/types";

interface EventTypeConfig {
  label: string;
  icon: LucideIcon;
  /** Tailwind bg + text classes for badges */
  badgeClass: string;
  /** Tailwind bg class for timeline dots */
  dotClass: string;
  /** Hex color for charts */
  color: string;
}

export const EVENT_TYPE_CONFIG: Record<EventType, EventTypeConfig> = {
  HARVEST:    { label: "Harvest",    icon: Leaf,  badgeClass: "bg-green-100  text-green-800  dark:bg-green-900  dark:text-green-200",  dotClass: "bg-green-500",  color: "#22c55e" },
  PROCESSING: { label: "Processing", icon: Cog,   badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", dotClass: "bg-orange-500", color: "#f97316" },
  SHIPPING:   { label: "Shipping",   icon: Truck, badgeClass: "bg-blue-100   text-blue-800   dark:bg-blue-900   dark:text-blue-200",   dotClass: "bg-blue-500",   color: "#3b82f6" },
  RETAIL:     { label: "Retail",     icon: Store, badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", dotClass: "bg-purple-500", color: "#a855f7" },
};
