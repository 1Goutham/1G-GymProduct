import type {
  ActivityItem,
  Device,
  Equipment,
  EquipmentCategory,
  FaultReport,
  FinanceMonth,
  GymConfig,
  InventoryItem,
  Invoice,
  Member,
  Plan,
  PlanId,
  PurchaseOrder,
  ServiceTicket,
  Session,
  Trainer,
  Transaction,
  Vendor,
  Zone,
} from "@/lib/types";

/* Deterministic PRNG so every boot tells the same story. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CONFIG: GymConfig = {
  name: "Forge Fitness",
  branch: "Anna Nagar",
  city: "Chennai",
  timeZone: "Asia/Kolkata",
  capacity: 160,
  open: 5,
  close: 23,
  currency: "INR",
};

export const PLANS: Plan[] = [
  { id: "monthly", name: "Monthly", months: 1, price: 2499 },
  { id: "quarterly", name: "Quarterly", months: 3, price: 6499 },
  { id: "half", name: "Half-yearly", months: 6, price: 11499 },
  { id: "annual", name: "Annual", months: 12, price: 19999 },
  { id: "student", name: "Student", months: 3, price: 4999 },
];

export const ZONES: Zone[] = [
  { id: "cardio", name: "Cardio deck", capacity: 40, x: 4, y: 4, w: 40, h: 22 },
  { id: "strength", name: "Strength floor", capacity: 50, x: 48, y: 4, w: 48, h: 30 },
  { id: "free", name: "Free weights", capacity: 34, x: 4, y: 30, w: 40, h: 26 },
  { id: "functional", name: "Functional turf", capacity: 22, x: 48, y: 38, w: 26, h: 18 },
  { id: "studio", name: "Studio", capacity: 24, x: 78, y: 38, w: 18, h: 18 },
];

/**
 * Expected share of capacity on the floor at a local fractional hour.
 * Weekdays have the classic double hump; weekends one long late-morning wave.
 */
export function crowdCurve(h: number, dow: number) {
  if (h < CONFIG.open || h >= CONFIG.close) return 0;
  const g = (mu: number, sigma: number, amp: number) => amp * Math.exp(-((h - mu) ** 2) / (2 * sigma ** 2));
  const weekend = dow === 0 || dow === 6;
  const v = weekend
    ? 0.12 + g(9, 1.8, 0.55) + g(17.5, 1.6, 0.4)
    : 0.12 + g(6.9, 1.35, 0.56) + g(12.6, 1.4, 0.12) + g(19.1, 1.35, 0.76);
  const fri = dow === 5 ? 0.86 : 1;
  const sun = dow === 0 ? 0.72 : 1;
  return Math.min(0.98, v * fri * sun);
}

/** Where people are, by time of day — cardio mornings, iron evenings. */
export function zoneWeights(h: number): Record<string, number> {
  const morning = h < 11;
  return morning
    ? { cardio: 0.34, strength: 0.27, free: 0.2, functional: 0.1, studio: 0.09 }
    : { cardio: 0.22, strength: 0.34, free: 0.26, functional: 0.1, studio: 0.08 };
}

const FIRST_F = ["Aishwarya", "Priya", "Divya", "Keerthana", "Meera", "Nandini", "Sowmya", "Lakshmi", "Harini", "Janani", "Kavya", "Shruti", "Ananya", "Revathi", "Deepika", "Swathi", "Pooja", "Ishita", "Varsha", "Nithya", "Sneha", "Tanvi", "Aditi", "Bhavana", "Gayathri"];
const FIRST_M = ["Arjun", "Karthik", "Vignesh", "Rahul", "Surya", "Pranav", "Aravind", "Naveen", "Gokul", "Hari", "Rohit", "Sanjay", "Vikram", "Ashwin", "Dinesh", "Bala", "Sriram", "Mohan", "Aditya", "Kiran", "Rajesh", "Varun", "Manoj", "Siddharth", "Deepak", "Ajay", "Nikhil"];
const LAST = ["Raman", "Krishnan", "Subramanian", "Iyer", "Natarajan", "Venkatesh", "Rao", "Menon", "Pillai", "Reddy", "Shankar", "Ganesan", "Murugan", "Sundaram", "Nair", "Chandran", "Balaji", "Rajan", "Kumar", "Srinivasan", "Prakash", "Mani", "Sekar", "Devan", "Joseph", "Thomas", "Fernandes", "Khan", "Sharma", "Gupta"];
const GOALS = ["Fat loss", "Muscle gain", "General fitness", "Strength", "Endurance", "Mobility", "Rehab", "Sports performance"];

export interface Seed {
  members: Member[];
  trainers: Trainer[];
  sessions: Session[];
  devices: Device[];
  equipment: Equipment[];
  faults: FaultReport[];
  tickets: ServiceTicket[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  orders: PurchaseOrder[];
  finance: FinanceMonth[];
  invoices: Invoice[];
  transactions: Transaction[];
  activity: ActivityItem[];
}

const DAY = 86400000;

export function buildSeed(now = Date.now()): Seed {
  const r = rng(1901);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const between = (a: number, b: number) => a + r() * (b - a);
  const int = (a: number, b: number) => Math.floor(between(a, b + 1));
  const iso = (t: number) => new Date(t).toISOString();

  /* ── Trainers ─────────────────────────────────────────────────────────── */
  const trainerDefs: [string, string, string[], number, number][] = [
    ["Vikram Natarajan", "Head coach", ["Strength", "Powerlifting"], 5.5, 13.5],
    ["Meera Iyer", "Senior trainer", ["Fat loss", "HIIT"], 5, 13],
    ["Karthik Raman", "Trainer", ["Hypertrophy", "Nutrition"], 6, 14],
    ["Divya Menon", "Yoga & mobility", ["Yoga", "Mobility", "Rehab"], 6, 11],
    ["Arjun Pillai", "Trainer", ["Functional", "CrossFit"], 14, 22.5],
    ["Sneha Reddy", "Senior trainer", ["Women's strength", "Postnatal"], 15, 22],
    ["Rohit Shankar", "Trainer", ["Bodybuilding", "Contest prep"], 15.5, 23],
    ["Ananya Krishnan", "Group instructor", ["Zumba", "Spin", "Dance"], 16, 21],
    ["Surya Ganesan", "Trainer", ["Athletic", "Boxing"], 13, 21],
    ["Harini Sundaram", "Physio", ["Rehab", "Assessment"], 9, 17],
    ["Naveen Chandran", "Floor trainer", ["General fitness"], 5, 12],
    ["Bala Murugan", "Floor trainer", ["General fitness", "Calisthenics"], 16, 23],
  ];
  const trainers: Trainer[] = trainerDefs.map(([name, role, specialties, start, end], i) => ({
    id: `t${i + 1}`,
    biometricId: String(9001 + i),
    name,
    role,
    specialties,
    rating: Math.round(between(4.3, 4.95) * 10) / 10,
    years: int(2, 12),
    shift: { start, end },
    clients: int(8, 26),
    monthlySalary: int(28, 68) * 1000,
    ptRate: [1200, 1000, 900, 1100, 900, 1100, 1000, 700, 900, 1500, 600, 600][i],
    hue: [210, 340, 28, 160, 260, 300, 15, 190, 45, 120, 230, 90][i],
    onFloor: false,
    lastPunch: null,
    onLeave: i === 7 && false,
  }));

  /* ── Members ──────────────────────────────────────────────────────────── */
  const members: Member[] = [];
  const planMix: PlanId[] = ["monthly", "monthly", "monthly", "quarterly", "quarterly", "half", "annual", "annual", "student"];
  for (let i = 0; i < 1240; i++) {
    const gender = r() < 0.44 ? "F" : "M";
    const name = `${pick(gender === "F" ? FIRST_F : FIRST_M)} ${pick(LAST)}`;
    const plan = pick(planMix);
    const months = PLANS.find((p) => p.id === plan)!.months;
    const joinedDaysAgo = int(3, 900);
    const cycleDays = months * 30;
    // position in current cycle
    const into = joinedDaysAgo % cycleDays;
    let expiresIn = cycleDays - into;
    const lapsed = r() < 0.09;
    if (lapsed) expiresIn = -int(1, 40);
    const engagement = r(); // 0 = ghost, 1 = daily
    const visits30 = lapsed ? int(0, 2) : Math.round(engagement ** 0.8 * 26);
    const lastVisitDays = visits30 === 0 ? int(14, 60) : Math.max(0, Math.round(between(0, 30 / Math.max(1, visits30)) * 1.4));
    const status: Member["status"] = expiresIn < 0 ? "expired" : r() < 0.02 ? "frozen" : expiresIn <= 10 ? "expiring" : "active";
    const risk = Math.min(
      0.97,
      Math.max(0.02, 0.85 - visits30 / 20 + (lastVisitDays > 10 ? 0.25 : 0) + (status === "expiring" ? 0.12 : 0) + (plan === "monthly" ? 0.06 : -0.04) + between(-0.08, 0.08)),
    );
    const morning = r() < 0.42;
    members.push({
      id: `m${1001 + i}`,
      biometricId: String(1001 + i),
      name,
      phone: `+91 9${int(100000000, 999999999)}`,
      gender,
      age: int(17, 58),
      goal: pick(GOALS),
      plan,
      joined: iso(now - joinedDaysAgo * DAY),
      expires: iso(now + expiresIn * DAY),
      status,
      visits30,
      lastVisit: iso(now - lastVisitDays * DAY - int(1, 12) * 3600000),
      avgSessionMin: int(42, 95),
      trainerId: r() < 0.18 ? pick(trainers).id : null,
      balanceDue: r() < 0.035 ? PLANS.find((p) => p.id === plan)!.price : 0,
      churnRisk: status === "expired" ? 1 : Math.round(risk * 100) / 100,
      habitHour: morning ? between(5.4, 9.6) : r() < 0.15 ? between(11, 14.5) : between(16.5, 21.8),
    });
  }

  /* ── Sessions for today (local hours) ─────────────────────────────────── */
  const sessions: Session[] = [];
  let sid = 1;
  for (const t of trainers) {
    const isGroup = t.role === "Group instructor" || t.role === "Yoga & mobility";
    for (let h = Math.ceil(t.shift.start); h < t.shift.end - 0.5; h++) {
      if (r() < (isGroup ? 0.45 : 0.62)) {
        const kind = isGroup ? "class" : t.role === "Physio" ? "assessment" : "pt";
        const m = kind === "class" ? null : pick(members.filter((x) => x.status !== "expired").slice(0, 400));
        sessions.push({
          id: `s${sid++}`,
          trainerId: t.id,
          title:
            kind === "class"
              ? pick(t.specialties) + " class"
              : kind === "assessment"
                ? "Movement assessment"
                : `PT · ${m!.name.split(" ")[0]}`,
          kind,
          start: h + (r() < 0.3 ? 0.5 : 0),
          minutes: kind === "class" ? 45 : kind === "assessment" ? 30 : 60,
          memberId: m?.id ?? null,
          zone: kind === "class" ? "studio" : pick(["strength", "free", "functional"]),
          capacity: kind === "class" ? 20 : undefined,
          booked: kind === "class" ? int(9, 20) : undefined,
        });
      }
    }
  }

  /* ── Devices ──────────────────────────────────────────────────────────── */
  const devices: Device[] = [
    { id: "d1", name: "Main entrance", model: "ZKTeco SpeedFace-V5L", serial: "CKUH224960231", location: "Lobby · turnstile A", kind: "entry", ip: "192.168.1.41", status: "online", lastHeartbeat: iso(now), templates: 1252, firmware: "ZAM180-NF24VB-Ver1.2.11", source: "simulator" },
    { id: "d2", name: "Exit gate", model: "ZKTeco SpeedFace-V5L", serial: "CKUH224960298", location: "Lobby · turnstile B", kind: "exit", ip: "192.168.1.42", status: "online", lastHeartbeat: iso(now), templates: 1252, firmware: "ZAM180-NF24VB-Ver1.2.11", source: "simulator" },
    { id: "d3", name: "Staff room", model: "eSSL X990 (fingerprint)", serial: "BOCK193460077", location: "Back office", kind: "staff", ip: "192.168.1.45", status: "online", lastHeartbeat: iso(now), templates: 18, firmware: "Ver 6.60 Apr 2024", source: "simulator" },
    { id: "d4", name: "Ladies' studio", model: "ZKTeco ProFace X", serial: "CN9V231120044", location: "Level 1 · studio door", kind: "entry", ip: "192.168.1.47", status: "offline", lastHeartbeat: iso(now - 47 * 60000), templates: 548, firmware: "ZMM510-NF24HA-Ver1.0.9", source: "simulator" },
  ];

  /* ── Vendors ──────────────────────────────────────────────────────────── */
  const vendors: Vendor[] = [
    { id: "v1", name: "Technofit Services", category: "Cardio service & AMC", contact: "Ramesh K.", phone: "+91 98400 11223", rating: 4.6, leadDays: 2, amc: true },
    { id: "v2", name: "IronWorks India", category: "Strength equipment", contact: "Faizal M.", phone: "+91 99620 44551", rating: 4.4, leadDays: 14, amc: false },
    { id: "v3", name: "NutriSource Distributors", category: "Supplements", contact: "Shalini P.", phone: "+91 90031 77889", rating: 4.2, leadDays: 3, amc: false },
    { id: "v4", name: "CleanPro Facility", category: "Consumables & housekeeping", contact: "Joseph A.", phone: "+91 94440 22110", rating: 4.0, leadDays: 2, amc: false },
    { id: "v5", name: "CoolAir HVAC", category: "HVAC & electrical", contact: "Senthil R.", phone: "+91 98840 66543", rating: 4.5, leadDays: 1, amc: true },
    { id: "v6", name: "Forge Merch Co.", category: "Apparel & merchandise", contact: "Neha S.", phone: "+91 97910 33445", rating: 4.3, leadDays: 10, amc: false },
  ];

  /* ── Equipment ────────────────────────────────────────────────────────── */
  const eqDefs: [string, EquipmentCategory, string, string, string, number, number, number, string][] = [
    // name, cat, brand, model, zone, count, cost, serviceInterval, vendor
    ["Treadmill", "Cardio", "Life Fitness", "Integrity SC", "cardio", 8, 485000, 500, "v1"],
    ["Elliptical cross-trainer", "Cardio", "Precor", "EFX 885", "cardio", 4, 410000, 600, "v1"],
    ["Spin bike", "Cardio", "Keiser", "M3i", "studio", 6, 168000, 700, "v1"],
    ["Rowing machine", "Cardio", "Concept2", "RowErg", "cardio", 3, 112000, 900, "v1"],
    ["Air bike", "Cardio", "Rogue", "Echo Bike", "functional", 2, 98000, 900, "v1"],
    ["Stair climber", "Cardio", "StairMaster", "8 Series Gauntlet", "cardio", 2, 620000, 450, "v1"],
    ["Cable crossover", "Strength", "Hammer Strength", "HD Elite", "strength", 2, 520000, 800, "v2"],
    ["Lat pulldown", "Strength", "Life Fitness", "Insignia", "strength", 2, 265000, 900, "v2"],
    ["Leg press", "Strength", "Hammer Strength", "Plate-loaded LP", "strength", 2, 390000, 1000, "v2"],
    ["Smith machine", "Strength", "Matrix", "Magnum", "strength", 1, 345000, 1000, "v2"],
    ["Chest press", "Strength", "Technogym", "Selection 900", "strength", 2, 310000, 1000, "v2"],
    ["Leg extension / curl", "Strength", "Technogym", "Selection 900", "strength", 2, 295000, 1000, "v2"],
    ["Power rack", "Free weights", "Rogue", "RM-6", "free", 4, 185000, 2000, "v2"],
    ["Dumbbell set 2.5–50kg", "Free weights", "Eleiko", "XF", "free", 1, 640000, 3000, "v2"],
    ["Adjustable bench", "Free weights", "Rogue", "Adjustable 3.0", "free", 8, 42000, 2500, "v2"],
    ["Functional trainer", "Functional", "Matrix", "Connexus", "functional", 1, 410000, 1200, "v2"],
    ["Sled track", "Functional", "Torque", "Tank M1", "functional", 1, 135000, 2500, "v2"],
    ["HVAC — main floor", "Facility", "Daikin", "VRV X 22HP", "strength", 1, 1450000, 700, "v5"],
    ["Steam room", "Facility", "Tylo", "Steam Pro 9kW", "studio", 1, 520000, 600, "v5"],
  ];
  const equipment: Equipment[] = [];
  let eqn = 1;
  for (const [name, category, brand, model, zone, count, cost, interval, vendorId] of eqDefs) {
    for (let k = 0; k < count; k++) {
      const ageDays = int(120, 1600);
      const dailyHours = category === "Cardio" ? between(6, 11) : category === "Facility" ? 17 : between(2, 7);
      const usage = Math.round(ageDays * dailyHours);
      const since = Math.round(between(0.15, 1.25) * interval);
      const tag = `${name.split(" ")[0].slice(0, 3).toUpperCase()}-${String(k + 1).padStart(2, "0")}`;
      equipment.push({
        id: `e${eqn++}`,
        tag,
        name: count > 1 ? `${name} ${k + 1}` : name,
        category,
        brand,
        model,
        zone,
        purchased: iso(now - ageDays * DAY),
        cost,
        warrantyUntil: iso(now - ageDays * DAY + (category === "Cardio" ? 3 : 5) * 365 * DAY),
        usageHours: usage,
        hoursSinceService: since,
        serviceIntervalHours: interval,
        lastService: iso(now - Math.round(since / dailyHours) * DAY),
        status: "operational",
        vendorId,
      });
    }
  }
  // A few stories
  const tm3 = equipment.find((e) => e.name === "Treadmill 3")!;
  tm3.status = "down";
  tm3.hoursSinceService = 690;
  const tm6 = equipment.find((e) => e.name === "Treadmill 6")!;
  tm6.status = "attention";
  tm6.hoursSinceService = 610;
  const cable = equipment.find((e) => e.name === "Cable crossover 2")!;
  cable.status = "attention";
  const spin4 = equipment.find((e) => e.name === "Spin bike 4")!;
  spin4.hoursSinceService = 840;
  const hvac = equipment.find((e) => e.name.startsWith("HVAC"))!;
  hvac.hoursSinceService = 655;

  const faults: FaultReport[] = [
    { id: "f1", equipmentId: tm3.id, reportedBy: "Karthik Raman", role: "trainer", issue: "Belt slipping at speeds above 10 km/h, burning smell from motor housing.", severity: "high", createdAt: iso(now - 26 * 3600000), status: "in-service", ticketId: "st1" },
    { id: "f2", equipmentId: tm6.id, reportedBy: "Priya Venkatesh", role: "member", issue: "Console resets mid-run; incline stuck at 4%.", severity: "medium", createdAt: iso(now - 5 * 3600000), status: "open", ticketId: null },
    { id: "f3", equipmentId: cable.id, reportedBy: "Vikram Natarajan", role: "trainer", issue: "Left cable frayed near the top pulley — needs replacement before it snaps.", severity: "high", createdAt: iso(now - 3 * 3600000), status: "open", ticketId: null },
    { id: "f4", equipmentId: equipment.find((e) => e.name === "Adjustable bench 5")!.id, reportedBy: "Rahul Iyer", role: "member", issue: "Seat pad torn, foam visible.", severity: "low", createdAt: iso(now - 3 * DAY), status: "open", ticketId: null },
    { id: "f5", equipmentId: equipment.find((e) => e.name === "Rowing machine 2")!.id, reportedBy: "Meera Iyer", role: "trainer", issue: "Chain noise on the recovery stroke.", severity: "low", createdAt: iso(now - 9 * DAY), status: "resolved", ticketId: "st4" },
  ];

  const tickets: ServiceTicket[] = [
    { id: "st1", equipmentId: tm3.id, vendorId: "v1", type: "breakdown", status: "awaiting-parts", opened: iso(now - 25 * 3600000), scheduledFor: iso(now + 20 * 3600000), closed: null, cost: 18500, notes: "Drive belt + motor brushes ordered. Technician revisit tomorrow 7am.", slaHours: 48 },
    { id: "st2", equipmentId: hvac.id, vendorId: "v5", type: "amc", status: "scheduled", opened: iso(now - 2 * DAY), scheduledFor: iso(now + 2 * DAY), closed: null, cost: 0, notes: "Quarterly AMC — filter wash, gas pressure check.", slaHours: 72 },
    { id: "st3", equipmentId: spin4.id, vendorId: "v1", type: "preventive", status: "scheduled", opened: iso(now - 1 * DAY), scheduledFor: iso(now + 3 * DAY), closed: null, cost: 2200, notes: "Brake pad + crank bearing check.", slaHours: 96 },
    { id: "st4", equipmentId: equipment.find((e) => e.name === "Rowing machine 2")!.id, vendorId: "v1", type: "breakdown", status: "completed", opened: iso(now - 9 * DAY), scheduledFor: iso(now - 8 * DAY), closed: iso(now - 8 * DAY), cost: 3400, notes: "Chain lubricated, idler replaced.", slaHours: 48 },
    { id: "st5", equipmentId: equipment.find((e) => e.name === "Treadmill 1")!.id, vendorId: "v1", type: "preventive", status: "completed", opened: iso(now - 16 * DAY), scheduledFor: iso(now - 15 * DAY), closed: iso(now - 15 * DAY), cost: 2800, notes: "Deck waxed, belt tension calibrated.", slaHours: 96 },
  ];

  /* ── Inventory ────────────────────────────────────────────────────────── */
  const inventory: InventoryItem[] = [
    { id: "i1", sku: "SUP-WHEY-2KG", name: "Whey isolate 2kg — chocolate", category: "Supplements", stock: 6, reorderPoint: 10, unitCost: 4200, price: 5499, monthlyUsage: 22, vendorId: "v3" },
    { id: "i2", sku: "SUP-CREA-300", name: "Creatine monohydrate 300g", category: "Supplements", stock: 18, reorderPoint: 8, unitCost: 1100, price: 1599, monthlyUsage: 14, vendorId: "v3" },
    { id: "i3", sku: "SUP-PRE-30", name: "Pre-workout 30 servings", category: "Supplements", stock: 4, reorderPoint: 6, unitCost: 1650, price: 2299, monthlyUsage: 9, vendorId: "v3" },
    { id: "i4", sku: "SUP-BAR-12", name: "Protein bars (box of 12)", category: "Supplements", stock: 31, reorderPoint: 15, unitCost: 960, price: 1440, monthlyUsage: 26, vendorId: "v3" },
    { id: "i5", sku: "CON-TOWEL", name: "Microfibre towels", category: "Consumables", stock: 140, reorderPoint: 120, unitCost: 140, price: null, monthlyUsage: 60, vendorId: "v4" },
    { id: "i6", sku: "CON-SANI-5L", name: "Equipment sanitiser 5L", category: "Consumables", stock: 3, reorderPoint: 6, unitCost: 850, price: null, monthlyUsage: 8, vendorId: "v4" },
    { id: "i7", sku: "CON-WIPES", name: "Disinfectant wipes (tub)", category: "Consumables", stock: 22, reorderPoint: 20, unitCost: 320, price: null, monthlyUsage: 30, vendorId: "v4" },
    { id: "i8", sku: "MER-TEE-M", name: "Forge dri-fit tee", category: "Merchandise", stock: 48, reorderPoint: 20, unitCost: 380, price: 899, monthlyUsage: 12, vendorId: "v6" },
    { id: "i9", sku: "MER-SHAKER", name: "Shaker bottle 700ml", category: "Merchandise", stock: 9, reorderPoint: 15, unitCost: 210, price: 499, monthlyUsage: 18, vendorId: "v6" },
    { id: "i10", sku: "SPR-BELT-TM", name: "Treadmill drive belt (Integrity)", category: "Spares", stock: 0, reorderPoint: 1, unitCost: 9800, price: null, monthlyUsage: 0.3, vendorId: "v1" },
    { id: "i11", sku: "SPR-CABLE-5M", name: "Steel cable 5mm (per 5m)", category: "Spares", stock: 1, reorderPoint: 2, unitCost: 2400, price: null, monthlyUsage: 0.4, vendorId: "v2" },
    { id: "i12", sku: "SPR-PAD-BENCH", name: "Bench seat pad", category: "Spares", stock: 0, reorderPoint: 2, unitCost: 3100, price: null, monthlyUsage: 0.3, vendorId: "v2" },
  ];

  /* ── Purchase orders ──────────────────────────────────────────────────── */
  const orders: PurchaseOrder[] = [
    { id: "PO-1042", title: "Treadmill 3 — drive belt & brushes", vendorId: "v1", lines: [{ name: "Drive belt (Integrity SC)", qty: 1, unitCost: 9800 }, { name: "Motor brush set", qty: 1, unitCost: 4200 }], status: "ordered", requestedBy: "Vikram Natarajan", createdAt: iso(now - 24 * 3600000), expected: iso(now + 18 * 3600000), reason: "Breakdown ticket ST-1", source: "manual" },
    { id: "PO-1041", title: "Monthly housekeeping consumables", vendorId: "v4", lines: [{ name: "Microfibre towels", qty: 100, unitCost: 140 }, { name: "Disinfectant wipes (tub)", qty: 30, unitCost: 320 }], status: "received", requestedBy: "Front desk", createdAt: iso(now - 8 * DAY), expected: iso(now - 5 * DAY), reason: "Monthly restock", source: "manual" },
    { id: "PO-1043", title: "Kettlebell set expansion (8–32kg)", vendorId: "v2", lines: [{ name: "Competition kettlebell", qty: 10, unitCost: 4800 }], status: "pending", requestedBy: "Arjun Pillai", createdAt: iso(now - 2 * DAY), expected: null, reason: "Functional class waitlist is 2× capacity on Tue/Thu.", source: "manual" },
    { id: "PO-1039", title: "Spin studio sound system", vendorId: "v6", lines: [{ name: "JBL PRX 915 speakers", qty: 2, unitCost: 68000 }], status: "rejected", requestedBy: "Ananya Krishnan", createdAt: iso(now - 20 * DAY), expected: null, reason: "Upgrade class experience", source: "manual" },
  ];

  /* ── Finance — 12 months ──────────────────────────────────────────────── */
  const finance: FinanceMonth[] = [];
  const d = new Date(now);
  for (let k = 11; k >= 0; k--) {
    const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - k, 1));
    const ym = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
    const mon = dt.getUTCMonth();
    const season = mon === 0 ? 1.2 : mon === 1 ? 1.08 : mon === 5 || mon === 6 ? 0.9 : mon === 9 || mon === 10 ? 0.95 : 1;
    const growth = 1 + (11 - k) * 0.018;
    const partial = k === 0 ? Math.min(1, new Date(now).getUTCDate() / 30) : 1;
    const mem = 1820000 * season * growth * between(0.96, 1.04);
    finance.push({
      month: ym,
      revenue: {
        memberships: Math.round(mem * partial),
        pt: Math.round(410000 * growth * between(0.9, 1.1) * partial),
        retail: Math.round(132000 * between(0.85, 1.15) * partial),
        other: Math.round(48000 * between(0.7, 1.3) * partial),
      },
      expenses: {
        payroll: Math.round(612000 * (k === 0 ? partial : 1)),
        rent: Math.round(350000 * (k === 0 ? partial : 1)),
        utilities: Math.round((mon >= 2 && mon <= 5 ? 168000 : 128000) * between(0.92, 1.08) * partial),
        maintenance: Math.round(52000 * between(0.6, 1.6) * partial),
        marketing: Math.round(95000 * between(0.7, 1.3) * partial),
        procurement: Math.round(118000 * between(0.6, 1.4) * partial),
        other: Math.round(36000 * between(0.8, 1.2) * partial),
      },
    });
  }

  /* ── Invoices & transactions ─────────────────────────────────────────── */
  const invoices: Invoice[] = [];
  let inv = 5201;
  for (const m of members) {
    if (m.balanceDue > 0) {
      const issuedDaysAgo = int(2, 40);
      const dueIn = 7 - issuedDaysAgo;
      invoices.push({
        id: `INV-${inv++}`,
        memberId: m.id,
        description: `${PLANS.find((p) => p.id === m.plan)!.name} renewal`,
        amount: m.balanceDue,
        issued: iso(now - issuedDaysAgo * DAY),
        due: iso(now + dueIn * DAY),
        status: dueIn < 0 ? "overdue" : "due",
      });
    }
  }
  for (let k = 0; k < 24; k++) {
    const m = pick(members);
    const plan = PLANS.find((p) => p.id === m.plan)!;
    invoices.push({ id: `INV-${inv++}`, memberId: m.id, description: `${plan.name} renewal`, amount: plan.price, issued: iso(now - int(0, 6) * DAY), due: iso(now), status: "paid" });
  }

  const transactions: Transaction[] = [];
  const labelsIn = ["Membership renewal", "New joining", "PT package (12 sessions)", "Supplement sale", "Merch sale", "Day pass", "Locker rental"];
  const labelsOut = ["Electricity — TNEB", "Housekeeping wages", "Vendor payment", "Facebook ads", "Water cans", "Technician visit"];
  for (let k = 0; k < 40; k++) {
    const isIn = r() < 0.72;
    const label = isIn ? pick(labelsIn) : pick(labelsOut);
    const amount = isIn
      ? label.startsWith("Membership")
        ? pick(PLANS).price
        : label.startsWith("New")
          ? pick(PLANS).price + 1000
          : label.startsWith("PT")
            ? 12000
            : int(4, 60) * 100
      : int(15, 400) * 100;
    transactions.push({
      id: `tx${k + 1}`,
      ts: iso(now - k * between(1.2, 5) * 3600000),
      kind: isIn ? "in" : "out",
      label,
      category: isIn ? (label.includes("PT") ? "PT" : label.includes("sale") ? "Retail" : label.includes("Locker") || label.includes("Day") ? "Other" : "Memberships") : label.includes("ads") ? "Marketing" : label.includes("Electric") || label.includes("Water") ? "Utilities" : "Operations",
      amount,
      method: isIn ? pick(["UPI", "UPI", "UPI", "Card", "Cash"] as const) : pick(["Bank", "UPI"] as const),
    });
  }

  const activity: ActivityItem[] = [
    { id: "a1", ts: iso(now - 3 * 3600000), kind: "equipment", text: "Vikram reported a frayed cable on Cable crossover 2" },
    { id: "a2", ts: iso(now - 5 * 3600000), kind: "equipment", text: "Member reported console resets on Treadmill 6" },
    { id: "a3", ts: iso(now - 24 * 3600000), kind: "purchase", text: "PO-1042 sent to Technofit Services" },
    { id: "a4", ts: iso(now - 47 * 60000), kind: "device", text: "Ladies' studio terminal stopped sending heartbeats" },
    { id: "a5", ts: iso(now - 2 * DAY), kind: "purchase", text: "Arjun requested 10 kettlebells (PO-1043)" },
  ];

  return { members, trainers, sessions, devices, equipment, faults, tickets, vendors, inventory, orders, finance, invoices, transactions, activity };
}
