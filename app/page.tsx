import { CareApp } from "@/components/care-app";
import { LoginCard } from "@/components/login-card";

export default function Home() {
  return (
    <main className="min-h-screen">
      <LoginCard />
      <div className="border-y border-slate-200 bg-slate-50/80" />
      <CareApp />
    </main>
  );
}
