"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createAssessment(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi berakhir, silakan masuk lagi." };

  const residentId = String(formData.get("resident_id") ?? "");
  const knowledgeItemId = String(formData.get("knowledge_item_id") ?? "");
  const examType = String(formData.get("exam_type") ?? "");
  const score = Number(formData.get("score") ?? 0);
  const maxScore = Number(formData.get("max_score") ?? 100);
  const examDate = String(formData.get("exam_date") ?? "");

  if (!residentId || !knowledgeItemId || !examType || !examDate) {
    return { error: "Lengkapi residen, butir, jenis ujian, dan tanggal." };
  }

  const { error } = await supabase.from("assessments").insert({
    resident_id: residentId,
    knowledge_item_id: knowledgeItemId,
    exam_type: examType,
    score,
    max_score: maxScore,
    exam_date: examDate,
    examiner_id: user.id,
    catatan: String(formData.get("catatan") ?? "") || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/penilaian");
  return { ok: true };
}
