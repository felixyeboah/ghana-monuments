import { MonumentExperience } from "@/components/monument-experience";
import { MONUMENTS } from "@/data/monuments";

export default function Home() {
  return <MonumentExperience monuments={MONUMENTS} />;
}
