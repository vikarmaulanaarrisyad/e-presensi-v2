import { redirect } from "next/navigation";

export default function GuruJurnalIndexPage() {
  redirect("/guru?tab=journal");
}
