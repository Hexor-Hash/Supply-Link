import type { TemplateStage } from "@/lib/types";

export interface SupplyChainTemplate {
  id: string;
  name: string;
  description: string;
  stages: TemplateStage[];
}

export const TEMPLATES: SupplyChainTemplate[] = [
  {
    id: "coffee",
    name: "Coffee",
    description: "Farm → Mill → Export → Import → Roaster → Retailer",
    stages: [
      { label: "Farm",     eventType: "HARVEST"    },
      { label: "Mill",     eventType: "PROCESSING" },
      { label: "Export",   eventType: "SHIPPING"   },
      { label: "Import",   eventType: "SHIPPING"   },
      { label: "Roaster",  eventType: "PROCESSING" },
      { label: "Retailer", eventType: "RETAIL"     },
    ],
  },
  {
    id: "pharma",
    name: "Pharmaceuticals",
    description: "Manufacturer → Distributor → Pharmacy",
    stages: [
      { label: "Manufacturer", eventType: "PROCESSING" },
      { label: "Distributor",  eventType: "SHIPPING"   },
      { label: "Pharmacy",     eventType: "RETAIL"     },
    ],
  },
  {
    id: "fashion",
    name: "Fashion",
    description: "Factory → QC → Warehouse → Retailer",
    stages: [
      { label: "Factory",   eventType: "PROCESSING" },
      { label: "QC",        eventType: "PROCESSING" },
      { label: "Warehouse", eventType: "SHIPPING"   },
      { label: "Retailer",  eventType: "RETAIL"     },
    ],
  },
];
