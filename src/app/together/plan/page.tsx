import { SharedPlanner } from "@/components/invitations/SharedPlanner";
export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; counter?: string; day?: string }>;
}) {
  const params = await searchParams;
  return (
    <SharedPlanner
      key={`${params.counter ? "counter" : "edit"}:${params.counter || params.edit || "new"}`}
      editId={params.edit}
      counterId={params.counter}
      initialDay={params.day}
    />
  );
}
