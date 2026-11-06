import { snapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(snapshot());
}
