/**
 * PII Minimization and Prompt Injection Defense Filter (ADR-009, Risk R-09, R-10)
 */

export interface PIISanitizationResult {
  sanitized: string;
  redactedPatternsCount: number;
}

// Regex patterns for sensitive identifiers
const CREDIT_CARD_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
const KENYA_NATIONAL_ID_REGEX = /\b(?:national\s*id|id\s*no\.?|id\s*number)[:\s]*\b\d{7,8}\b/gi;
const PRIVATE_KEY_REGEX = /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/gi;
const PASSWORD_SECRET_REGEX = /\b(?:password|passwd|secret|api[-_]?key|token)[:\s=]+["']?[^\s"']{8,}["']?/gi;
const BEARER_AUTH_REGEX = /Bearer\s+[A-Za-z0-9\-_.~+/]+=*/gi;

/**
 * Sanitizes arbitrary text inputs prior to forwarding to external AI providers.
 * Replaces high-risk identifiers with neutral token place-holders.
 */
export function sanitizePII(input: string): PIISanitizationResult {
  if (!input) {
    return { sanitized: '', redactedPatternsCount: 0 };
  }

  let count = 0;
  let text = input;

  text = text.replace(CREDIT_CARD_REGEX, () => {
    count++;
    return '[REDACTED_PAYMENT_CARD]';
  });

  text = text.replace(KENYA_NATIONAL_ID_REGEX, () => {
    count++;
    return 'ID_NO: [REDACTED_NATIONAL_ID]';
  });

  text = text.replace(PRIVATE_KEY_REGEX, () => {
    count++;
    return '[REDACTED_PRIVATE_KEY]';
  });

  text = text.replace(BEARER_AUTH_REGEX, () => {
    count++;
    return 'Bearer [REDACTED_TOKEN]';
  });

  text = text.replace(PASSWORD_SECRET_REGEX, (match) => {
    count++;
    const prefix = match.split(/[:\s=]+/)[0];
    return `${prefix}: [REDACTED_SECRET]`;
  });

  return {
    sanitized: text,
    redactedPatternsCount: count,
  };
}

/**
 * Wraps user-supplied text inside clear isolation tags to mitigate prompt injection (Risk R-10).
 */
export function wrapUntrustedData(content: string, tag = 'untrusted_document_content'): string {
  const sanitized = sanitizePII(content).sanitized;
  return `<${tag}>\n${sanitized}\n</${tag}>`;
}
