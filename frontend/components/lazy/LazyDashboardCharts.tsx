import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/skeletons/LoadingSkeletons";

const DashboardCharts = dynamic(
  () => import("@/components/dashboard/DashboardCharts"),
  {
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    ),
    ssr: false,
  }
);

export { DashboardCharts as LazyDashboardCharts };
