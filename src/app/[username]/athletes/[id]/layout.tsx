import { notFound } from "next/navigation";
import { getAthlete } from "@/lib/athletes/queries";

interface AthleteLayoutProps {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

// Validates the athlete once for every athlete sub-page.
export default async function AthleteLayout({ params, children }: AthleteLayoutProps) {
  const { id } = await params;
  if (!(await getAthlete(id))) notFound();

  return children;
}
