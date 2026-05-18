import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, response } = await request.json();

    if (!email || !response) {
      return NextResponse.json(
        { error: "Email și response sunt obligatorii" },
        { status: 400 }
      );
    }

    // Send response notification to user
    const emailResponse = await resend.emails.send({
      from: "Kelunia Feedback <feedback@kelunia.app>",
      to: email,
      subject: "✉️ Echipa Kelunia a răspuns la feedbackul tău",
      html: `
        <h2>Mulțumim pentru feedback!</h2>
        <p>Echipa Kelunia a luat în considerare sugestia ta și a vrut să-ți răspundă direct:</p>
        <div style="background: #f6f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1787ff;">
          <p>${response.replace(/\n/g, "<br />")}</p>
        </div>
        <p>Dacă ai mai mult de spus, <a href="${process.env.NEXT_PUBLIC_APP_URL}/feedback">putem continua conversația în app</a>.</p>
        <hr />
        <p style="color: #667085; font-size: 14px;">
          Kelunia - Programări clare pentru fiecare spațiu
        </p>
      `,
    });

    if (emailResponse.error) {
      console.error("Error sending response notification:", emailResponse.error);
      return NextResponse.json(
        { error: "Nu am putut trimite notificarea" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, messageId: emailResponse.data?.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in feedback response notification API:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
