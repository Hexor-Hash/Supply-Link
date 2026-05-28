import { cva, type VariantProps } from "class-variance-authority";
import { ReactNode } from "react";
import { clsx } from "clsx";
import { EVENT_TYPE_CONFIG } from "@/lib/eventTypeConfig";
import type { EventType } from "@/lib/types";

const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
  {
    variants: {
      variant: {
        harvest:    EVENT_TYPE_CONFIG.HARVEST.badgeClass,
        processing: EVENT_TYPE_CONFIG.PROCESSING.badgeClass,
        shipping:   EVENT_TYPE_CONFIG.SHIPPING.badgeClass,
        retail:     EVENT_TYPE_CONFIG.RETAIL.badgeClass,
        default:    "bg-[var(--muted-bg)] text-[var(--foreground)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode;
  className?: string;
  eventType?: EventType;
}

export function Badge({ variant, eventType, className, children }: BadgeProps) {
  const resolvedVariant = eventType
    ? (eventType.toLowerCase() as "harvest" | "processing" | "shipping" | "retail")
    : variant;
  const cfg = eventType ? EVENT_TYPE_CONFIG[eventType] : null;
  const Icon = cfg?.icon;

  return (
    <span className={clsx(badgeVariants({ variant: resolvedVariant }), "gap-1", className)}>
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}
