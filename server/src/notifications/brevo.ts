/**
 * Brevo Transactional Email Notification Adapter
 * Implements Risk R-14/R-16 Neutral Notification Content Policy:
 * Notification bodies NEVER disclose private vault contents, DEKs, passwords,
 * or explicit death declarations. They provide secure, authenticated portal links.
 * Reference: TDD Chapter 10.4, Chapter 24
 */

import {
  TrusteeInvitationNotificationPayload,
  InactivityNoticePayload,
  ReleaseGrantNotificationPayload,
  EmergencyHoldNotificationPayload,
  DeathCaseStatusAlertPayload,
} from '@portfolio-immortalized/domain';

export interface EmailMessage {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  tags?: string[];
  referenceId?: string;
}

export interface SendEmailResult {
  messageId: string;
  status: 'queued' | 'sent' | 'delivered';
}

export interface BrevoClientConfig {
  apiKey?: string;
  senderEmail?: string;
  senderName?: string;
  isMock?: boolean;
}

export class BrevoNotificationAdapter {
  private apiKey: string;
  private senderEmail: string;
  private senderName: string;
  private isMock: boolean;
  public sentMessages: EmailMessage[] = [];

  constructor(config: BrevoClientConfig = {}) {
    this.apiKey = config.apiKey || process.env.BREVO_API_KEY || 'mock-brevo-key';
    this.senderEmail = config.senderEmail || process.env.BREVO_SENDER_EMAIL || 'security@portfolio-immortalized.com';
    this.senderName = config.senderName || process.env.BREVO_SENDER_NAME || 'Portfolio Immortalized Custody';
    this.isMock = config.isMock ?? (process.env.NODE_ENV !== 'production' || !process.env.BREVO_API_KEY);
  }

  /**
   * Dispatches email via Brevo REST API or records in mock sink
   */
  async sendEmail(message: EmailMessage): Promise<SendEmailResult> {
    if (this.isMock) {
      const messageId = `mock_msg_${Math.random().toString(36).substring(2, 12)}`;
      this.sentMessages.push(message);
      return { messageId, status: 'sent' };
    }

    // Production Brevo API v3 dispatch
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: this.senderName, email: this.senderEmail },
        to: [{ email: message.to, name: message.toName || message.to }],
        subject: message.subject,
        htmlContent: message.htmlContent,
        textContent: message.textContent,
        tags: message.tags,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BREVO_DISPATCH_FAILED: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as { messageId?: string };
    const messageId = data.messageId || `brevo_${Date.now()}`;
    return { messageId, status: 'sent' };
  }

  // ============================================================================
  // Neutral Email Templates (TDD Chapter 24 & Risk R-14/R-16)
  // ============================================================================

  renderTrusteeInvitation(payload: TrusteeInvitationNotificationPayload): EmailMessage {
    const subject = 'Action Required: You have been appointed as a Legacy Trustee';
    const textContent = `Hello ${payload.recipientName || 'there'},\n\n` +
      `${payload.ownerName} has designated you as an estate trustee on the Portfolio Immortalized custody platform.\n\n` +
      `To accept or review your appointment, please visit your secure verification portal:\n${payload.actionUrl}\n\n` +
      `This invitation link expires on ${new Date(payload.expiresAtIso).toUTCString()}.\n\n` +
      `If you did not expect this invitation or wish to decline, please visit the portal to decline or ignore this message.\n\n` +
      `Portfolio Immortalized Custody Operations`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">Trustee Appointment Notice</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          <strong>${payload.ownerName}</strong> has nominated you as a designated estate trustee on <strong>Portfolio Immortalized</strong>.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Trustees play a vital role in corroborating custody status and safeguarding legacy integrity in accordance with Hong Kong Probate and Administration Ordinance (Cap. 10) and Trustee Ordinance (Cap. 29).
        </p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${payload.actionUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Review & Accept Trustee Role
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px;">
          This secure single-use link expires on <strong>${new Date(payload.expiresAtIso).toUTCString()}</strong>.<br/>
          If you do not recognize the nominator or do not wish to act as trustee, you can decline on the portal.
        </p>
      </div>
    `;

    return {
      to: payload.recipientEmail,
      toName: payload.recipientName,
      subject,
      htmlContent,
      textContent,
      tags: ['trustee-invitation'],
      referenceId: payload.referenceId,
    };
  }

  renderInactivityNotice(payload: InactivityNoticePayload): EmailMessage {
    const isOwner = payload.stage !== 'TRUSTEE_ALERT_104D';
    let subject = 'Custody Check-in: Please verify your account activity';
    if (payload.stage === 'INQUIRY_90D') {
      subject = 'Urgent: Custody status confirmation required';
    } else if (payload.stage === 'TRUSTEE_ALERT_104D') {
      subject = 'Notice of Trustee Inquiry regarding Portfolio Immortalized Custody';
    }

    const textContent = isOwner
      ? `Hello,\n\nWe noticed there has been no recorded activity on your Portfolio Immortalized account recently.\n\n` +
        `To confirm your account remains active and prevent scheduled trustee escalation, please sign in:\n${payload.actionUrl}\n\n` +
        `Portfolio Immortalized Security Team`
      : `Dear Trustee,\n\nIn accordance with estate custody protocols, the account owner has remained unreachable after routine check-in cycles.\n\n` +
        `As a designated trustee, you are requested to check in on the custody portal to provide status corroboration or report updates:\n${payload.actionUrl}\n\n` +
        `Portfolio Immortalized Custody Operations`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">${isOwner ? 'Custody Check-in' : 'Trustee Status Verification Notice'}</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          ${isOwner
            ? 'We are conducting a scheduled activity verification for your protected vault. Simply signing in will refresh your activity timestamp.'
            : 'Scheduled contact cycles for the account owner have elapsed without response. As an appointed trustee, your status confirmation or evidence review is requested.'}
        </p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${payload.actionUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            ${isOwner ? 'Confirm Account Activity' : 'Access Trustee Portal'}
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px;">
          Reference Stage: ${payload.stage} | Monitored since ${new Date(payload.lastActivityIso).toUTCString()}
        </p>
      </div>
    `;

    return {
      to: payload.recipientEmail,
      toName: payload.recipientName,
      subject,
      htmlContent,
      textContent,
      tags: ['inactivity-notice', payload.stage.toLowerCase()],
      referenceId: payload.referenceId,
    };
  }

  renderReleaseGrant(payload: ReleaseGrantNotificationPayload): EmailMessage {
    const subject = 'Confidential: Designated Legacy Materials Ready for Access';
    const textContent = `Hello ${payload.recipientName || 'there'},\n\n` +
      `You have been granted secure access to ${payload.assetCount} authorized legacy items designated by ${payload.ownerName}.\n\n` +
      `Access your confidential delivery portal using the link below:\n${payload.actionUrl}\n\n` +
      `This grant remains active until ${new Date(payload.expiresAtIso).toUTCString()}.\n\n` +
      `Note: All released items are forensically stamped for recipient authenticity under Cap. 160 regulations.\n\n` +
      `Portfolio Immortalized Custody`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">Authorized Legacy Release</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          In accordance with verified estate instructions, authorized materials designated by <strong>${payload.ownerName}</strong> have completed administrative review and are now available for your secure retrieval.
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #475569; font-size: 14px;"><strong>Authorized Items:</strong> ${payload.assetCount} documents/records</p>
          <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px;"><strong>Grant Expiry:</strong> ${new Date(payload.expiresAtIso).toUTCString()}</p>
        </div>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${payload.actionUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Access Beneficiary Portal
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px;">
          All downloads are watermarked with your identity in compliance with Hong Kong evidence governance (Cap. 160).
        </p>
      </div>
    `;

    return {
      to: payload.recipientEmail,
      toName: payload.recipientName,
      subject,
      htmlContent,
      textContent,
      tags: ['release-grant'],
      referenceId: payload.referenceId || payload.grantId,
    };
  }

  renderEmergencyHold(payload: EmergencyHoldNotificationPayload): EmailMessage {
    const subject = 'Important Security Alert: Estate Release Put on Hold';
    const textContent = `Security Notification:\n\n` +
      `An emergency hold has been placed on estate case ${payload.caseId || 'involving your account'}.\n` +
      `Reason: ${payload.reasonCode}\n` +
      `Details: ${payload.narrative}\n\n` +
      `All pending release grants have been temporarily frozen pending administrative and legal verification.\n\n` +
      `Portfolio Immortalized Security Operations`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fecaca; background-color: #fffaf0; border-radius: 8px;">
        <h2 style="color: #991b1b; margin-top: 0;">Emergency Estate Hold Notice</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          An emergency hold has been triggered. All automated and pending release procedures are currently suspended.
        </p>
        <p style="color: #7f1d1d; font-size: 14px;"><strong>Reason Code:</strong> ${payload.reasonCode}</p>
        <blockquote style="border-left: 3px solid #dc2626; margin: 12px 0; padding-left: 12px; color: #4b5563;">
          ${payload.narrative}
        </blockquote>
      </div>
    `;

    return {
      to: payload.recipientEmail,
      toName: payload.recipientName,
      subject,
      htmlContent,
      textContent,
      tags: ['emergency-hold'],
      referenceId: payload.referenceId || payload.caseId,
    };
  }

  renderDeathCaseStatusAlert(payload: DeathCaseStatusAlertPayload): EmailMessage {
    const subject = `Notice: Estate Case Status Updated (${payload.newState})`;
    const textContent = `Case Notification:\n\n` +
      `Estate case ${payload.caseId} transitioned from ${payload.previousState} to ${payload.newState}.\n\n` +
      (payload.actionUrl ? `Access case details: ${payload.actionUrl}\n\n` : '') +
      `Portfolio Immortalized Case Operations`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">Case Status Update</h2>
        <p style="color: #334155; font-size: 15px;">
          Case <code>${payload.caseId}</code> status has been updated to <strong>${payload.newState}</strong>.
        </p>
        ${payload.actionUrl ? `<p><a href="${payload.actionUrl}">View Case Details</a></p>` : ''}
      </div>
    `;

    return {
      to: payload.recipientEmail,
      toName: payload.recipientName,
      subject,
      htmlContent,
      textContent,
      tags: ['case-status-alert'],
      referenceId: payload.caseId,
    };
  }
}
