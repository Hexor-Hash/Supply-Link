import dynamic from "next/dynamic";
import { QRScannerSkeleton } from "@/components/skeletons/LoadingSkeletons";

const QRScanner = dynamic(() => import("@/components/tracking/QRScanner").then(mod => ({ default: mod.QRScanner })), {
  loading: () => <QRScannerSkeleton />,
  ssr: false,
});

export { QRScanner as LazyQRScanner };
