import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";

type AbsentNotificationInput = {
  parentEmail: string;
  parentName?: string | null;
  studentName: string;
  schoolName: string;
  classroomName: string;
  sessionDate: Date;
  lessonPlanNumber: number | null;
};

export async function sendAbsentNotification(
  input: AbsentNotificationInput
): Promise<{ sent: boolean; reason?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "FWIS <notifications@fwis.org>";

  if (!resendKey) {
    console.warn("[FWIS] RESEND_API_KEY not set — skipping absent notification");
    return { sent: false, reason: "Email not configured" };
  }

  const dateStr = input.sessionDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const greeting = input.parentName ? `Dear ${input.parentName},` : "Dear Parent/Guardian,";
  const weekLabel = formatLessonPlanLabel(input.lessonPlanNumber);

  const html = `
    <div style="font-family:sans-serif;max-width:560px;line-height:1.5">
      <p>${greeting}</p>
      <p>This is to inform you that <strong>${input.studentName}</strong> was marked
      <strong>Absent</strong> for ${weekLabel} (${dateStr})
      at <strong>${input.schoolName}</strong>, class <strong>${input.classroomName}</strong>.</p>
      <p>If you believe this is an error, please contact your child's teacher or school administrator.</p>
      <p style="color:#666;font-size:13px">Faizan Weekend Islamic School Management System</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.parentEmail],
        subject: `Absence Notice — ${input.studentName} — ${dateStr}`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[FWIS] Resend error:", body);
      return { sent: false, reason: "Email provider error" };
    }

    return { sent: true };
  } catch (error) {
    console.error("[FWIS] Failed to send absent notification:", error);
    return { sent: false, reason: "Send failed" };
  }
}
