import { insights } from "@/lib/ai/engine";
import { Card, PageHeader } from "@/components/ui/primitives";
import { CopilotChat } from "@/components/modules/copilot-chat";
import { InsightList } from "@/components/ai/insight-list";
import { SparkArt } from "@/components/illustrations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Copilot" };

export default async function CopilotPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const engine = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? "claude" : "offline";
  const ins = insights();
  return (
    <>
      <PageHeader eyebrow="Business" title="Copilot" subtitle="Your operations analyst. It reads the same live data you see — floor, trainers, machines, stock and the books." art={<SparkArt size={112} />} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <CopilotChat engine={engine} initialQuestion={q} />
        <Card title="What 1G AI is watching" subtitle="Ranked by urgency" className="hidden xl:block">
          <InsightList items={ins} limit={7} />
        </Card>
      </div>
    </>
  );
}
