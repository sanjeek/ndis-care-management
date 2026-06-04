import {
  AlertTriangle,
  Building2,
  ClipboardList,
  ClipboardCheck,
  Clock3,
  Database,
  Bell,
  CircleDollarSign,
  Download,
  FileText,
  FileSignature,
  HeartPulse,
  HeartHandshake,
  Home,
  LayoutDashboard,
  ListChecks,
  History,
  MessageSquare,
  Pill,
  Network,
  UserCircle,
  ReceiptText,
  Smartphone,
  Settings,
  ShieldCheck,
  Target,
  UserCog,
  Users,
  WalletCards
} from "lucide-react";

export const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Branches", href: "/branches", icon: Building2 },
  { label: "Participants", href: "/participants", icon: HeartHandshake },
  { label: "Care Plans", href: "/care-plans", icon: HeartPulse },
  { label: "Medications", href: "/medications", icon: Pill },
  { label: "Support Workers", href: "/support-workers", icon: Users },
  { label: "Rostering", href: "/rostering", icon: Clock3 },
  { label: "Timesheets", href: "/timesheets", icon: ClipboardCheck },
  { label: "Payroll Export", href: "/payroll", icon: Download },
  { label: "Progress Notes", href: "/progress-notes", icon: FileText },
  { label: "Incident Reports", href: "/incident-reports", icon: AlertTriangle },
  { label: "Risk Assessments", href: "/risk-assessments", icon: ClipboardList },
  { label: "Invoices", href: "/invoices", icon: ReceiptText },
  { label: "NDIS Funding", href: "/funding", icon: CircleDollarSign },
  { label: "Support Coordination", href: "/support-coordination", icon: Network },
  { label: "Service Agreements", href: "/service-agreements", icon: FileSignature },
  { label: "Documents", href: "/documents", icon: WalletCards },
  { label: "Worker Portal", href: "/worker-portal", icon: Smartphone },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Tasks", href: "/tasks", icon: ListChecks },
  { label: "Participant Goals", href: "/participant-goals", icon: Target },
  { label: "Family Portal", href: "/family-portal", icon: Home },
  { label: "My Shifts", href: "/my-shifts", icon: ListChecks },
  { label: "User Management", href: "/admin/users", icon: UserCog },
  { label: "Database Backups", href: "/admin/backups", icon: Database },
  { label: "Reminder Monitoring", href: "/admin/reminders", icon: Bell },
  { label: "NDIS Compliance", href: "/admin/compliance", icon: ShieldCheck },
  { label: "Audit Logs", href: "/admin/audit", icon: History },
  { label: "Profile", href: "/profile", icon: UserCircle },
  { label: "Settings", href: "/settings", icon: Settings }
];

export type MetricRecord = {
  label: string;
  value: string;
  delta: string;
  tone: string;
  icon: typeof Clock3;
};

export type ShiftRecord = {
  time: string;
  participant: string;
  participantName: string;
  worker: string;
  workerEmail: string;
  location: string;
  status: string;
};

export type ParticipantRecord = {
  name: string;
  ndis: string;
  plan: string;
  emergency: string;
  needs: string;
  docs: number;
  notes: number;
};

export type WorkerRecord = {
  name: string;
  email: string;
  role: string;
  availability: string;
  qualifications: string;
  compliance: string;
  assigned: number;
};

export type IncidentRecord = {
  title: string;
  participant: string;
  priority: string;
  due: string;
};

export type DocumentRecord = {
  name: string;
  count: number;
  icon: typeof ShieldCheck;
};

export const metrics: MetricRecord[] = [
  { label: "Today's shifts", value: "0", delta: "No shifts scheduled today", tone: "gumleaf", icon: Clock3 },
  { label: "Active participants", value: "0", delta: "No participants yet", tone: "harbour", icon: HeartHandshake },
  { label: "Staff on duty", value: "0", delta: "No workers yet", tone: "banksia", icon: Users },
  { label: "Pending timesheets", value: "0", delta: "No pending timesheets", tone: "coral", icon: ClipboardCheck }
];

export const todayShifts: ShiftRecord[] = [];
export const participants: ParticipantRecord[] = [];
export const workers: WorkerRecord[] = [];
export const incidents: IncidentRecord[] = [];
export const documents: DocumentRecord[] = [];
