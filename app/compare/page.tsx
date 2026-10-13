import { Results } from "@/components/results";
export default function Page() {
  return <Results compare mode={process.env.TASTEWEAVE_DATA_MODE ?? "mock"} />;
}
