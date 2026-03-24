import { getDisplayName } from "./institution-utils";

interface Change {
  field: string;
  fieldLabel: string;
  oldValue: string | number | null;
  newValue: string | number;
}

interface EmailParams {
  school: string;
  program: string;
  degree: string;
  season: string;
  changes: Change[];
  lang: string;
  appUrl: string;
}

const t = (lang: string, en: string, zh: string) => (lang === "zh" ? zh : en);

function degreeLabel(degree: string, lang: string): string {
  const map: Record<string, [string, string]> = {
    masters: ["Master's", "硕士"],
    phd: ["PhD", "博士"],
    mba: ["MBA", "MBA"],
    jd: ["JD", "法学博士"],
    md: ["MD", "医学博士"],
    bachelors: ["Bachelor's", "学士"],
    other: ["Other", "其他"],
  };
  const pair = map[degree.toLowerCase()] || [degree, degree];
  return lang === "zh" ? pair[1] : pair[0];
}

function formatValue(val: string | number | null, lang: string): string {
  if (val === null || val === undefined) return t(lang, "N/A", "无数据");
  return String(val);
}

export function buildNotificationEmail(params: EmailParams): {
  subject: string;
  html: string;
} {
  const { school, program, degree, season, changes, lang, appUrl } = params;

  const displayName = getDisplayName(school, lang);
  const degreeStr = degreeLabel(degree, lang);

  const subject = t(
    lang,
    `📢 Update: ${displayName} — ${program} ${degreeStr}`,
    `📢 更新提醒: ${displayName} — ${program} ${degreeStr}`
  );

  const changeRows = changes
    .map(
      (c) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f0ede8;color:#5c5650;font-size:13px;">
          ${c.fieldLabel}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0ede8;color:#9c9590;font-size:13px;text-decoration:line-through;">
          ${formatValue(c.oldValue, lang)}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0ede8;color:#e08a5e;font-weight:600;font-size:13px;">
          ${formatValue(c.newValue, lang)}
        </td>
      </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f5;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

        <!-- Logo -->
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-family:'Courier New',monospace;font-size:20px;font-weight:700;color:#3a3632;letter-spacing:-0.5px;">
            Waitlisteria
          </span>
          <span style="font-size:14px;margin-left:4px;">😭</span>
        </td></tr>

        <!-- Card -->
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
            style="background:#ffffff;border:1px solid #e8e4de;border-radius:16px;overflow:hidden;">

            <!-- Header -->
            <tr><td style="padding:28px 28px 0;">
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9c9590;font-weight:600;">
                ${t(lang, "Waitlist Update", "候补名单更新")}
              </p>
              <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#3a3632;">
                ${displayName}
              </h1>
              <p style="margin:0 0 20px;font-size:13px;color:#7a756f;">
                ${program} · ${degreeStr} · ${season}
              </p>
            </td></tr>

            <!-- Changes table -->
            <tr><td style="padding:0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="border:1px solid #f0ede8;border-radius:10px;overflow:hidden;">
                <tr style="background:#faf8f5;">
                  <th style="padding:8px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9c9590;font-weight:600;">
                    ${t(lang, "Field", "字段")}
                  </th>
                  <th style="padding:8px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9c9590;font-weight:600;">
                    ${t(lang, "Before", "之前")}
                  </th>
                  <th style="padding:8px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#9c9590;font-weight:600;">
                    ${t(lang, "Now", "现在")}
                  </th>
                </tr>
                ${changeRows}
              </table>
            </td></tr>

            <!-- CTA -->
            <tr><td style="padding:24px 28px;">
              <a href="${appUrl}/${lang}/track"
                style="display:inline-block;padding:12px 32px;background:#e08a5e;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
                ${t(lang, "View Full Details", "查看完整详情")} →
              </a>
            </td></tr>

          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#bbb5ad;">
            ${t(
              lang,
              "You're receiving this because you're watching this school on Waitlisteria.",
              "您收到此邮件是因为您在 Waitlisteria 上关注了此学校。"
            )}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  return { subject, html };
}
