type SESConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  fromEmail: string;
};

type SendEmailParams = {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
};

type SendEmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();

  async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  }

  return hmacSha256(encoder.encode('AWS4' + key), dateStamp)
    .then((kDate) => hmacSha256(kDate, regionName))
    .then((kRegion) => hmacSha256(kRegion, serviceName))
    .then((kService) => hmacSha256(kService, 'aws4_request'));
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(key: ArrayBuffer, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function createSESClient(config: SESConfig) {
  const { accessKeyId, secretAccessKey, region, fromEmail } = config;
  const service = 'ses';
  const host = `email.${region}.amazonaws.com`;

  async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const { to, subject, htmlBody, textBody } = params;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const requestParams = new URLSearchParams();
    requestParams.append('Action', 'SendEmail');
    requestParams.append('Version', '2010-12-01');
    requestParams.append('Source', fromEmail);
    requestParams.append('Destination.ToAddresses.member.1', to);
    requestParams.append('Message.Subject.Data', subject);
    requestParams.append('Message.Subject.Charset', 'UTF-8');
    requestParams.append('Message.Body.Html.Data', htmlBody);
    requestParams.append('Message.Body.Html.Charset', 'UTF-8');

    if (textBody) {
      requestParams.append('Message.Body.Text.Data', textBody);
      requestParams.append('Message.Body.Text.Charset', 'UTF-8');
    }

    const requestBody = requestParams.toString();
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const canonicalHeaders =
      `content-type:application/x-www-form-urlencoded\n` +
      `host:${host}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-date';
    const payloadHash = await sha256(requestBody);

    const canonicalRequest =
      'POST\n' +
      canonicalUri +
      '\n' +
      canonicalQueryString +
      '\n' +
      canonicalHeaders +
      '\n' +
      signedHeaders +
      '\n' +
      payloadHash;

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign =
      algorithm +
      '\n' +
      amzDate +
      '\n' +
      credentialScope +
      '\n' +
      (await sha256(canonicalRequest));

    const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signature = await hmacSha256Hex(signingKey, stringToSign);

    const authorizationHeader =
      `${algorithm} ` +
      `Credential=${accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, ` +
      `Signature=${signature}`;

    try {
      const response = await fetch(`https://${host}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Amz-Date': amzDate,
          Authorization: authorizationHeader,
        },
        body: requestBody,
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('[SES] Email send failed:', responseText);
        return {
          success: false,
          error: `SES request failed with status ${response.status}: ${responseText}`,
        };
      }

      const messageIdMatch = responseText.match(/<MessageId>(.+?)<\/MessageId>/);
      const messageId = messageIdMatch ? messageIdMatch[1] : undefined;

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SES] Email send error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  return {
    sendEmail,
  };
}

export type SESClient = ReturnType<typeof createSESClient>;
