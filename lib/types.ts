export type PlanId = "monthly" | "quarterly" | "half" | "annual" | "student";

export interface Plan {
  id: PlanId;
  name: string;
  months: number;
  price: number; // total price in INR
}

export type MemberStatus = "active" | "expiring" | "expired" | "frozen";

export interface Member {
  id: string;
  biometricId: string;
  name: string;
  phone: string;
  gender: "F" | "M";
  age: number;
  goal: string;
  plan: PlanId;
  joined: string;
  expires: string;
  status: MemberStatus;
  visits30: number;
  lastVisit: string | null;
  avgSessionMin: number;
  trainerId: string | null;
  balanceDue: number;
  churnRisk: number; // 0..1
  /** preferred hour of day (local), drives the simulator */
  habitHour: number;
}

export type SessionKind = "pt" | "class" | "assessment";

export interface Session {
  id: string;
  trainerId: string;
  title: string;
  kind: SessionKind;
  start: number; // local hour, fractional (e.g. 6.5 = 06:30)
  minutes: number;
  memberId: string | null;
  zone: string;
  capacity?: number;
  booked?: number;
}

export interface Trainer {
  id: string;
  biometricId: string;
  name: string;
  role: string;
  specialties: string[];
  rating: number;
  years: number;
  shift: { start: number; end: number };
  clients: number;
  monthlySalary: number;
  ptRate: number;
  hue: number;
  onFloor: boolean;
  lastPunch: string | null;
  onLeave: boolean;
}

export interface Zone {
  id: string;
  name: string;
  capacity: number;
  /** floor plan geometry in a 100×60 viewbox */
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Direction = "in" | "out";
export type Method = "face" | "finger" | "palm" | "card";

export interface BiometricEvent {
  id: string;
  ts: string;
  deviceId: string;
  personId: string;
  personType: "member" | "trainer" | "staff" | "unknown";
  name: string;
  direction: Direction;
  method: Method;
  verified: boolean;
  note?: string;
}

export interface Device {
  id: string;
  name: string;
  model: string;
  serial: string;
  location: string;
  kind: "entry" | "exit" | "staff";
  ip: string;
  status: "online" | "offline";
  lastHeartbeat: string;
  templates: number;
  firmware: string;
  source: "simulator" | "adms" | "webhook";
}

export type EquipmentCategory = "Cardio" | "Strength" | "Free weights" | "Functional" | "Facility";
export type EquipmentStatus = "operational" | "attention" | "down";

export interface Equipment {
  id: string;
  tag: string;
  name: string;
  category: EquipmentCategory;
  brand: string;
  model: string;
  zone: string;
  purchased: string;
  cost: number;
  warrantyUntil: string;
  usageHours: number;
  hoursSinceService: number;
  serviceIntervalHours: number;
  lastService: string;
  status: EquipmentStatus;
  vendorId: string;
}

export type Severity = "low" | "medium" | "high";

export interface FaultReport {
  id: string;
  equipmentId: string;
  reportedBy: string;
  role: "member" | "trainer" | "staff" | "ai";
  issue: string;
  severity: Severity;
  createdAt: string;
  status: "open" | "in-service" | "resolved";
  ticketId: string | null;
}

export type TicketStatus = "scheduled" | "in-progress" | "awaiting-parts" | "completed";

export interface ServiceTicket {
  id: string;
  equipmentId: string;
  vendorId: string;
  type: "preventive" | "breakdown" | "amc";
  status: TicketStatus;
  opened: string;
  scheduledFor: string;
  closed: string | null;
  cost: number;
  notes: string;
  slaHours: number;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contact: string;
  phone: string;
  rating: number;
  leadDays: number;
  amc: boolean;
}

export type InventoryCategory = "Supplements" | "Consumables" | "Merchandise" | "Spares";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  stock: number;
  reorderPoint: number;
  unitCost: number;
  price: number | null;
  monthlyUsage: number;
  vendorId: string;
}

export type POStatus = "draft" | "pending" | "approved" | "ordered" | "received" | "rejected";

export interface POLine {
  name: string;
  qty: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  title: string;
  vendorId: string;
  lines: POLine[];
  status: POStatus;
  requestedBy: string;
  createdAt: string;
  expected: string | null;
  reason: string;
  source: "manual" | "ai";
}

export interface FinanceMonth {
  month: string; // YYYY-MM
  revenue: { memberships: number; pt: number; retail: number; other: number };
  expenses: { payroll: number; rent: number; utilities: number; maintenance: number; marketing: number; procurement: number; other: number };
}

export interface Invoice {
  id: string;
  memberId: string;
  description: string;
  amount: number;
  issued: string;
  due: string;
  status: "paid" | "due" | "overdue";
}

export interface Transaction {
  id: string;
  ts: string;
  kind: "in" | "out";
  label: string;
  category: string;
  amount: number;
  method: "UPI" | "Card" | "Cash" | "Bank";
}

export interface ActivityItem {
  id: string;
  ts: string;
  kind: "equipment" | "service" | "purchase" | "finance" | "member" | "device" | "ai";
  text: string;
}

export interface GymConfig {
  name: string;
  branch: string;
  city: string;
  timeZone: string;
  capacity: number;
  open: number;
  close: number;
  currency: "INR";
}

export interface LiveSnapshot {
  now: string;
  inside: number;
  capacity: number;
  members: number;
  trainersOnFloor: number;
  staffOnFloor: number;
  entriesToday: number;
  peakToday: { count: number; at: string };
  zones: { id: string; name: string; count: number; capacity: number }[];
  hourly: { hour: number; count: number | null; forecast: number }[];
  events: BiometricEvent[];
  devices: Device[];
  trainers: { id: string; name: string; onFloor: boolean; busyUntil: number | null; nextFree: number | null; hue: number; role: string }[];
  simulator: boolean;
}
