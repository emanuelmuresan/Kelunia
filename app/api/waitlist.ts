import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const OWNER_EMAIL = "emanuelmuresan@gmail.com";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Email invalid" },
        { status: 400 }
      );
    }

    // Send notification to owner about new waitlist signup
    const ownerEmailResponse = await resend.emails.send({
      from: "Kelunia Waitlist <waitlist@kelunia.app>",
      to: OWNER_EMAIL,
      subject: `📋 Cineva nou s-a alăturat listei de așteptare: ${email}`,
      html: `
        <h2>Nou abonent la lista de așteptare</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p>Timp: ${new Date().toLocaleString("ro-RO")}</p>
      `,
    });

    if (ownerEmailResponse.error) {
      console.error("Error sending waitlist notification:", ownerEmailResponse.error);
    }

    // Send confirmation email to user
    const userEmailResponse = await resend.emails.send({
      from: "Kelunia <hello@kelunia.app>",
      to: email,
      subject: "✉️ Te-ai alăturat listei de așteptare Kelunia",
      html: `
        <h2>Mulțumim!</h2>
        <p>Te-ai alăturat cu succes listei de așteptare a Kelunia.</p>
        <p>Vei primi notificări doar despre:</p>
        <ul>
          <li>Feature-uri importante și lansări</li>
          <li>Actualizări relevante</li>
          <li>Oferte speciale și beta access</li>
        </ul>
        <p>Până atunci, explorează mai mult despre Kelunia pe <a href="${process.env.NEXT_PUBLIC_APP_URL}">site-ul nostru</a>.</p>
        <hr />
        <p style="color: #667085; font-size: 14px;">
          Kelunia - Programări clare pentru fiecare spațiu
        </p>
      `,
    });

    if (userEmailResponse.error) {
      console.error("Error sending confirmation email:", userEmailResponse.error);
      return NextResponse.json(
        { error: "Nu am putut trimite confirmarea" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, messageId: userEmailResponse.data?.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in waitlist API:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
