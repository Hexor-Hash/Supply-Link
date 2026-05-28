import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/skeletons/LoadingSkeletons";

const AdvancedCharts = dynamic(() => import("@/components/dashboard/AdvancedCharts"), {
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  ),
  ssr: false,
});

export { AdvancedCharts as LazyAdvancedCharts };
