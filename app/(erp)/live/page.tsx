import { snapshot } from "@/lib/store";
import { CONFIG, crowdCurve } from "@/lib/data/seed";
import { PageHeader, Card } from "@/components/ui/primitives";
import { LiveFloor } from "@/components/live/live-floor";
import { Heatmap } from "@/components/charts/charts";
import { FingerprintArt } from "@/components/illustrations";
import { hourLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live floor" };

export default function LivePage() {
  const snap = snapshot();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dow = [1, 2, 3, 4, 5, 6, 0];
  const hours = Array.from({ length: CONFIG.close - CONFIG.open }, (_, i) => CONFIG.open + i);
  const values = dow.map((d) => hours.map((h) => crowdCurve(h + 0.5, d)));
  return (
    <>
      <PageHeader
        eyebrow="Operate"
        title="Live floor"
        subtitle="Real-time headcount from your biometric turnstiles, zone density, and who's free to coach — refreshed every two seconds."
        art={<FingerprintArt size={112} />}
      />
      <LiveFloor initial={snap} />
      <Card className="mt-5" title="A typical week" subtitle="Average share of capacity by day and hour — plan shifts and classes around the heat.">
        <Heatmap rows={days} cols={hours.map((h) => hourLabel(h))} values={values} />
      </Card>
    </>
  );
}
