import {
  AlertTriangle,
  ClipboardCheck,
  Clock3,
  FileText,
  HeartHandshake,
  Home,
  LayoutDashboard,
  ReceiptText,
  Smartphone,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
  WalletCards
} from "lucide-react";

export const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Participants", href: "/participants", icon: HeartHandshake },
  { label: "Support Workers", href: "/support-workers", icon: Users },
  { label: "Rostering", href: "/rostering", icon: Clock3 },
  { label: "Timesheets", href: "/timesheets", icon: ClipboardCheck },
  { label: "Progress Notes", href: "/progress-notes", icon: FileText },
  { label: "Incident Reports", href: "/incident-reports", icon: AlertTriangle },
  { label: "Invoices", href: "/invoices", icon: ReceiptText },
  { label: "Documents", href: "/documents", icon: WalletCards },
  { label: "Worker Portal", href: "/worker-portal", icon: Smartphone },
  { label: "Settings", href: "/settings", icon: Settings }
];

export const metrics = [
  { label: "Today's shifts", value: "18", delta: "4 starting before noon", tone: "gumleaf", icon: Clock3 },
  { label: "Active participants", value: "126", delta: "9 plan reviews due", tone: "harbour", icon: HeartHandshake },
  { label: "Staff on duty", value: "42", delta: "6 sleepover shifts", tone: "banksia", icon: Users },
  { label: "Pending timesheets", value: "11", delta: "3 require review", tone: "coral", icon: ClipboardCheck }
];

export const todayShifts = [
  { time: "07:00 - 11:00", participant: "Mia H.", participantName: "Mia Harrison", worker: "Asha Patel", workerEmail: "asha.patel@example.com", location: "Parramatta NSW", status: "Confirmed" },
  { time: "09:30 - 15:30", participant: "Noah B.", participantName: "Noah Bennett", worker: "Liam Nguyen", workerEmail: "liam.nguyen@example.com", location: "Geelong VIC", status: "In progress" },
  { time: "16:00 - 20:00", participant: "Grace T.", participantName: "Grace Thompson", worker: "Sophie Clarke", workerEmail: "sophie.clarke@example.com", location: "Brisbane QLD", status: "Unfilled" },
  { time: "13:00 - 17:00", participant: "Mia H.", participantName: "Mia Harrison", worker: "Asha Patel", workerEmail: "asha.patel@example.com", location: "Blacktown NSW", status: "Confirmed" }
];

export const participants = [
  {
    name: "Mia Harrison",
    ndis: "431 829 602",
    plan: "NDIS managed",
    emergency: "Elena Harrison, 0400 123 889",
    needs: "Community access, medication prompts, meal preparation",
    docs: 8,
    notes: 24
  },
  {
    name: "Noah Bennett",
    ndis: "529 114 772",
    plan: "Plan managed",
    emergency: "Theo Bennett, 0412 667 904",
    needs: "Personal care, transport, behaviour support plan",
    docs: 11,
    notes: 37
  },
  {
    name: "Grace Thompson",
    ndis: "620 775 184",
    plan: "Self managed",
    emergency: "Iris Thompson, 0428 555 201",
    needs: "Domestic assistance, social participation, physiotherapy routine",
    docs: 6,
    notes: 18
  }
];

export const workers = [
  {
    name: "Asha Patel",
    email: "asha.patel@example.com",
    role: "Disability Support Worker",
    availability: "Mon, Tue, Thu",
    qualifications: "Cert III Individual Support, First Aid, CPR",
    compliance: "Clear",
    assigned: 7
  },
  {
    name: "Liam Nguyen",
    email: "liam.nguyen@example.com",
    role: "Senior Support Worker",
    availability: "Weekdays",
    qualifications: "Medication assist, manual handling, epilepsy training",
    compliance: "WWCC renews in 42 days",
    assigned: 9
  },
  {
    name: "Sophie Clarke",
    email: "sophie.clarke@example.com",
    role: "Community Access Worker",
    availability: "Wed to Sun",
    qualifications: "Cert IV Disability, positive behaviour support",
    compliance: "Clear",
    assigned: 5
  }
];

export const incidents = [
  { title: "Medication variance", participant: "Noah Bennett", priority: "Medium", due: "Review today" },
  { title: "Transport delay", participant: "Mia Harrison", priority: "Low", due: "Close after family call" },
  { title: "Fall during transfer", participant: "Grace Thompson", priority: "High", due: "Manager sign-off" }
];

export const documents = [
  { name: "Service agreements", count: 94, icon: ShieldCheck },
  { name: "Care plans", count: 126, icon: Stethoscope },
  { name: "Home risk checks", count: 71, icon: Home },
  { name: "Compliance evidence", count: 214, icon: FileText }
];
