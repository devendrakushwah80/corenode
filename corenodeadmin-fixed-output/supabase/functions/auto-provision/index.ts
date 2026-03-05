/**
 * CoreNodeAdmin – Auto-Provision Edge Function
 * ─────────────────────────────────────────────
 * Triggered via HTTP POST when admin approves an order.
 *
 * Flow:
 *   1. Receive order_id + credentials from admin panel
 *   2. Update order status → Approved + save credentials
 *   3. Send email to customer with panel login
 *   4. Return success/error
 *
 * Deploy:
 *   supabase functions deploy auto-provision
 *
 * Environment variables required (set in Supabase dashboard):
 *   SUPABASE_URL            – your project URL
 *   SUPABASE_SERVICE_ROLE   – service role key (full access)
 *   RESEND_API_KEY          – Resend.com API key for emails
 *   FROM_EMAIL              – sender email (e.g. noreply@corenodeadmin.in)
 *   PANEL_BASE_URL          – default panel URL (e.g. https://panel.corenode.in)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { order_id, panel_link, panel_username, panel_password, admin_note } = body;

    if (!order_id || !panel_link || !panel_username || !panel_password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: order_id, panel_link, panel_username, panel_password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Create Supabase admin client (service role = bypasses RLS) ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE") ?? ""
    );

    // ── 1. Fetch the order ──
    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (fetchErr || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found", detail: fetchErr?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Update order → Approved + credentials ──
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "Approved",
        panel_link,
        panel_username,
        panel_password,
        approved_at: new Date().toISOString(),
        admin_note: admin_note || null,
      })
      .eq("id", order_id);

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: "Failed to update order", detail: updateErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Send credentials email via Resend ──
    const customerEmail = order.customer_email;
    const customerName  = order.customer_name || "Valued Customer";
    const planName      = order.plan_name || "Hosting Plan";

    let emailSent = false;
    let emailError = null;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@corenodeadmin.in";

    if (resendKey && customerEmail) {
      const emailBody = buildEmailHTML({
        customerName,
        planName,
        panelLink: panel_link,
        username: panel_username,
        password: panel_password,
        orderId: order_id,
        adminNote: admin_note,
      });

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `CoreNodeAdmin <${fromEmail}>`,
          to: [customerEmail],
          subject: `🚀 Your ${planName} is Ready! – CoreNodeAdmin`,
          html: emailBody,
        }),
      });

      if (emailRes.ok) {
        emailSent = true;
        // Log email sent in order record
        await supabase.from("orders").update({ email_sent: true }).eq("id", order_id);
      } else {
        const errText = await emailRes.text();
        emailError = errText;
        console.error("Resend email failed:", errText);
      }
    } else {
      emailError = resendKey ? "No customer email on record" : "RESEND_API_KEY not configured";
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id,
        status: "Approved",
        email_sent: emailSent,
        email_error: emailError,
        message: emailSent
          ? `Order approved and credentials emailed to ${customerEmail}`
          : `Order approved. Email not sent: ${emailError}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/* ── Email HTML builder ── */
function buildEmailHTML(opts: {
  customerName: string;
  planName: string;
  panelLink: string;
  username: string;
  password: string;
  orderId: string | number;
  adminNote?: string;
}): string {
  const { customerName, planName, panelLink, username, password, orderId, adminNote } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your Server is Ready – CoreNodeAdmin</title>
</head>
<body style="margin:0;padding:0;background:#0b0f1a;font-family:'Inter',Arial,sans-serif;color:#f0f4f8">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f1a;padding:40px 20px">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#111827;border-radius:16px;border:1px solid #1a2438;overflow:hidden">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#0d1a2a,#131f30);padding:32px 32px 24px;border-bottom:1px solid #1a2438">
        <table width="100%"><tr>
          <td>
            <div style="display:inline-flex;align-items:center;gap:10px">
              <div style="width:36px;height:36px;background:linear-gradient(135deg,#00ff9c,#00c97a);border-radius:8px;display:inline-block;text-align:center;line-height:36px;font-weight:900;font-size:12px;color:#0b0f1a;font-family:Arial">CN</div>
              <span style="font-weight:800;font-size:18px;letter-spacing:2px;color:#f0f4f8">CORENODEADMIN</span>
            </div>
          </td>
          <td align="right">
            <span style="background:rgba(0,255,156,0.1);color:#00ff9c;border:1px solid rgba(0,255,156,0.25);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700">SERVER READY</span>
          </td>
        </tr></table>
      </td></tr>

      <!-- Hero -->
      <tr><td style="padding:32px 32px 0;text-align:center">
        <div style="font-size:48px;margin-bottom:12px">🚀</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f0f4f8">Your server is live!</h1>
        <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6">Hi ${esc(customerName)}, your <strong style="color:#f0f4f8">${esc(planName)}</strong> has been activated and is ready to use.</p>
      </td></tr>

      <!-- Credentials Box -->
      <tr><td style="padding:24px 32px">
        <div style="background:#0b0f1a;border:1px solid #00ff9c33;border-radius:12px;padding:20px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#00ff9c;margin-bottom:16px">🔐 Your Login Credentials</div>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:0 0 12px">
                <div style="font-size:11px;color:#4b5a72;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Control Panel</div>
                <a href="${esc(panelLink)}" style="color:#00ff9c;font-size:14px;font-weight:600;text-decoration:none">${esc(panelLink)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 12px">
                <div style="background:#111827;border:1px solid #1a2438;border-radius:8px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
                  <span style="font-size:11px;color:#4b5a72;font-weight:600;text-transform:uppercase;letter-spacing:1px">Username</span>
                  <span style="font-family:'Courier New',monospace;font-size:14px;color:#f0f4f8;font-weight:700">${esc(username)}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div style="background:#111827;border:1px solid #1a2438;border-radius:8px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
                  <span style="font-size:11px;color:#4b5a72;font-weight:600;text-transform:uppercase;letter-spacing:1px">Password</span>
                  <span style="font-family:'Courier New',monospace;font-size:14px;color:#00ff9c;font-weight:700">${esc(password)}</span>
                </div>
              </td>
            </tr>
          </table>

          <a href="${esc(panelLink)}" style="display:block;margin-top:16px;background:linear-gradient(135deg,#00ff9c,#00d882);color:#0b0f1a;text-align:center;text-decoration:none;font-weight:800;font-size:14px;padding:14px;border-radius:8px;letter-spacing:0.5px">
            🎮 Open Control Panel
          </a>
        </div>
      </td></tr>

      ${adminNote ? `
      <!-- Admin Note -->
      <tr><td style="padding:0 32px 24px">
        <div style="background:#111827;border:1px solid #243047;border-radius:8px;padding:14px 16px">
          <div style="font-size:11px;color:#4b5a72;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">📋 Note from Support</div>
          <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6">${esc(adminNote)}</p>
        </div>
      </td></tr>` : ''}

      <!-- Order Info -->
      <tr><td style="padding:0 32px 24px">
        <div style="background:#0d1220;border-radius:8px;padding:14px 16px">
          <table width="100%">
            <tr>
              <td style="font-size:12px;color:#4b5a72">Order ID</td>
              <td align="right" style="font-family:'Courier New',monospace;font-size:12px;color:#94a3b8">#${esc(String(orderId))}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#4b5a72;padding-top:6px">Plan</td>
              <td align="right" style="font-size:12px;color:#94a3b8;padding-top:6px">${esc(planName)}</td>
            </tr>
          </table>
        </div>
      </td></tr>

      <!-- Security Warning -->
      <tr><td style="padding:0 32px 24px">
        <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:12px 16px">
          <p style="margin:0;font-size:12px;color:#fbbf24;line-height:1.6">⚠️ <strong>Security tip:</strong> Please change your password after first login. Never share your credentials with anyone.</p>
        </div>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:20px 32px 28px;border-top:1px solid #1a2438;text-align:center">
        <p style="margin:0 0 8px;font-size:12px;color:#4b5a72">Need help? Reply to this email or open a support ticket at</p>
        <a href="https://corenodeadmin.in" style="color:#00ff9c;font-size:12px;text-decoration:none">corenodeadmin.in</a>
        <p style="margin:12px 0 0;font-size:11px;color:#2a3548">© CoreNodeAdmin. All rights reserved.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
