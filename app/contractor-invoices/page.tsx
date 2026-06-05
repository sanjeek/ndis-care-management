import { ContractorInvoicesPage } from "@/components/contractor-invoices-page";
import { redirect } from "next/navigation";

export default function Page() {
  if (process.env.NEXT_PUBLIC_ENABLE_CONTRACTOR_INVOICES !== "true") {
    redirect("/invoices");
  }

  return <ContractorInvoicesPage />;
}
