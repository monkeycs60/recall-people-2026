export function buildPasswordResetEmailHtml(params: {
  userName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): string {
  const { userName, resetUrl, expiresInMinutes } = params;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recall People - Reinitialisation du mot de passe</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FAF7F2;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF7F2; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #C67C4E 0%, #A35E36 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Recall People</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Reinitialisation du mot de passe</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; color: #1A1612; font-size: 16px; line-height: 1.6;">
                Bonjour ${userName},
              </p>
              <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                Vous avez demande la reinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour creer un nouveau mot de passe.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <a href="${resetUrl}"
                       style="display: inline-block; padding: 14px 32px; background-color: #C67C4E; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                      Reinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Ce lien expirera dans <strong>${expiresInMinutes} minutes</strong>.
              </p>

              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
              </p>
              <p style="margin: 0; padding: 12px; background-color: #FAF7F2; border-radius: 6px; font-size: 12px; color: #1A1612; word-break: break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>

          <!-- Security notice -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <div style="padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                  <strong>Note de securite :</strong> Si vous n'avez pas demande cette reinitialisation, ignorez cet email. Votre mot de passe restera inchange.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #FAF7F2; border-top: 1px solid #E8E2DB; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center; line-height: 1.6;">
                Cet email a ete envoye par Recall People.
                <br>
                Si vous avez des questions, contactez-nous a support@clementserizay.com
              </p>
            </td>
          </tr>
        </table>

        <!-- Copyright -->
        <table width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                &copy; ${new Date().getFullYear()} Recall People. Tous droits reserves.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function buildPasswordResetEmailText(params: {
  userName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): string {
  const { userName, resetUrl, expiresInMinutes } = params;

  return `Recall People - Reinitialisation du mot de passe

Bonjour ${userName},

Vous avez demande la reinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour creer un nouveau mot de passe :

${resetUrl}

Ce lien expirera dans ${expiresInMinutes} minutes.

---

Note de securite : Si vous n'avez pas demande cette reinitialisation, ignorez cet email. Votre mot de passe restera inchange.

---

(c) ${new Date().getFullYear()} Recall People
`;
}
