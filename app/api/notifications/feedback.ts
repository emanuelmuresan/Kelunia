import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const OWNER_EMAIL = "emanuelmuresan@gmail.com";

export async function POST(request: NextRequest) {
  try {
    const { email, message, userId } = await request.json();

    if (!email || !message) {
      return NextResponse.json(
        { error: "Email și message sunt obligatorii" },
        { status: 400 }
      );
    }

    // Send notification to owner
    const ownerEmailResponse = await resend.emails.send({
      from: "Kelunia Feedback <feedback@kelunia.app>",
      to: OWNER_EMAIL,
      subject: `📬 Feedback nou de la ${email}`,
      html: `
        <h2>Feedback nou de la utilizator</h2>
        <p><strong>De la:</strong> ${email}</p>
        <p><strong>User ID:</strong> ${userId || "Nu este logat"}</p>
        <hr />
        <p>${message.replace(/\n/g, "<br />")}</p>
        <hr />
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/feedback" style="background: #1787ff; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">
            Vezi și răspunde în app
          </a>
        </p>
      `,
    });

    if (ownerEmailResponse.error) {
      console.error("Error sending owner notification:", ownerEmailResponse.error);
      return NextResponse.json(
        { error: "Nu am putut trimite notificarea" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, messageId: ownerEmailResponse.data?.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in feedback notification API:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
