import { Results } from "@/components/results";
export default function Page() {
  return <Results mode={process.env.TASTEWEAVE_DATA_MODE ?? "mock"} />;
}
