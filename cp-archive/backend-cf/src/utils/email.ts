/**
 * 邮件发送工具（使用 Resend HTTP API）
 *
 * Cloudflare Workers 不支持 nodemailer（需要 Node.js net 模块），
 * Resend 通过标准 HTTPS 接口发送，完全兼容 Workers 边缘运行时。
 */

const RESEND_API_URL = 'https://api.resend.com/emails'

interface SendEmailOptions {
  apiKey:  string
  from:    string
  to:      string
  subject: string
  html:    string
  text?:   string
}

async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const res = await fetch(RESEND_API_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${opts.apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    opts.from,
      to:      [opts.to],
      subject: opts.subject,
      html:    opts.html,
      text:    opts.text,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '(无响应体)')
    throw new Error(`Resend 邮件发送失败：${res.status} ${body}`)
  }
}

/**
 * 发送密码重置验证码邮件
 */
export async function sendResetCodeEmail(
  apiKey:       string,
  from:         string,
  to:           string,
  code:         string,
  displayName?: string | null,
): Promise<void> {
  const greeting = displayName ? `你好，${displayName}！` : '你好！'

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>密码重置验证码</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#f472b6,#ec4899);height:4px;"></td>
          </tr>
          <tr>
            <td style="padding:40px 36px;">
              <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700;">CP 档案站</h2>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">密码重置验证码</p>
              <p style="margin:0 0 12px;font-size:15px;color:#374151;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                你正在申请重置密码，请使用以下验证码完成验证：
              </p>
              <div style="background:#fdf2f8;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
                <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#ec4899;">${code}</span>
              </div>
              <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">验证码有效期：<strong>10 分钟</strong></p>
              <p style="margin:0 0 24px;font-size:13px;color:#9ca3af;">如果这不是你发起的操作，请忽略本邮件，你的账号是安全的。</p>
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;" />
              <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">此邮件由系统自动发送，请勿直接回复。</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `${greeting}\n\n你正在申请重置密码，验证码为：${code}\n\n验证码有效期 10 分钟。\n\n如非本人操作，请忽略此邮件。`

  await sendEmail({
    apiKey,
    from,
    to,
    subject: `【CP 档案站】密码重置验证码：${code}`,
    html,
    text,
  })
}
