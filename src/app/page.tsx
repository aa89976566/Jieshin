import { HomeShell } from "@/components/HomeShell";
import { site } from "@/lib/site";

export default function HomePage() {
  return <HomeShell data={site} />;
}
