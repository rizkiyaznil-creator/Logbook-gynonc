import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { ResidentProgress } from "@/components/resident-progress";

export default async function ResidenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  // Hanya staf & supervisor yang boleh melihat detail residen lain.
  if (!["supervisor", "kps", "admin"].includes(profile.role)) {
    redirect("/dashboard");
  }
  const { id } = await params;

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm text-teal-700 hover:underline">
        ← Daftar residen
      </Link>
      <ResidentProgress residentId={id} />
    </div>
  );
}
