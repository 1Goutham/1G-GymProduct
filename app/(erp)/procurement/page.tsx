import { ShoppingBag, Clock3, PackageX, IndianRupee } from "lucide-react";
import { db } from "@/lib/store";
import { inventoryView, poTotal } from "@/lib/derive";
import { PageHeader, Stat } from "@/components/ui/primitives";
import { ProcurementBoard, type InvRow, type PORow } from "@/components/modules/procurement-board";
import { CartArt } from "@/components/illustrations";
import { inrShort } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Procurement" };

export default async function ProcurementPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const sp = await searchParams;
  const s = db();
  const vendorName = (id: string) => s.vendors.find((v) => v.id === id)?.name ?? "—";
  const orders: PORow[] = s.orders.map((o) => ({ ...o, vendor: vendorName(o.vendorId), total: poTotal(o) }));
  const inv = inventoryView();
  const inventory: InvRow[] = inv
    .map((i) => ({ id: i.id, sku: i.sku, name: i.name, category: i.category, stock: i.stock, reorderPoint: i.reorderPoint, unitCost: i.unitCost, daysLeft: i.daysLeft, low: i.low, suggestQty: i.suggestQty, vendor: vendorName(i.vendorId) }))
    .sort((a, b) => Number(b.low) - Number(a.low) || a.daysLeft - b.daysLeft);
  const awaiting = s.orders.filter((o) => o.status === "pending");
  const inFlight = s.orders.filter((o) => o.status === "ordered" || o.status === "approved");
  const stockValue = inv.reduce((a, i) => a + i.stock * i.unitCost, 0);

  return (
    <>
      <PageHeader eyebrow="Assets" title="Procurement" subtitle="Purchase requests with a real approval trail, vendor lead times and stock that reorders itself." art={<CartArt size={112} />} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Awaiting approval" value={awaiting.length} hint={inrShort(awaiting.reduce((a, o) => a + poTotal(o), 0))} icon={<Clock3 className="size-4" />} tone={awaiting.length ? "warn" : undefined} />
        <Stat label="In flight" value={inFlight.length} hint={inrShort(inFlight.reduce((a, o) => a + poTotal(o), 0))} icon={<ShoppingBag className="size-4" />} />
        <Stat label="Below reorder point" value={inv.filter((i) => i.low).length} hint={`${inv.filter((i) => i.stock === 0).length} out of stock`} icon={<PackageX className="size-4" />} />
        <Stat label="Stock on hand" value={inrShort(stockValue)} hint={`${inv.length} SKUs`} icon={<IndianRupee className="size-4" />} />
      </div>
      <ProcurementBoard orders={orders} inventory={inventory} vendors={s.vendors} openNew={sp.new === "1"} />
    </>
  );
}
