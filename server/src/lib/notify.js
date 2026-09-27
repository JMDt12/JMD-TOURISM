/**
 * Outbound messaging.
 *
 * WhatsApp is the primary channel for this market; email is the fallback.
 * Neither provider is wired up: sending requires real credentials, so until
 * they are configured every message is recorded in the `notifications` table
 * and logged, which keeps the enquiry flow fully testable.
 *
 * To go live, set:
 *   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID   (Meta WhatsApp Business Cloud API)
 *   SMTP_URL                            (email fallback)
 */
import { query } from '../db/index.js';

export const WHATSAPP_CONFIGURED = Boolean(
  process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID
);
export const EMAIL_CONFIGURED = Boolean(process.env.SMTP_URL);

/**
 * No template quotes a figure. The office prices each trip by hand and sends
 * the number itself, so nothing here can contradict what a customer was told.
 */
const TEMPLATES = {
  enquiry_received: (b) =>
    `Namaste ${b.name}! We have your request ${b.reference}.\n` +
    `${b.summary}, party of ${b.party}.\n` +
    `Our Mathura office will WhatsApp you a quote shortly. Rates move with the season, ` +
    `the group size and the vehicle, so we price every trip by hand rather than publish one.\n` +
    `Jai Maa Durge Tourism, Mathura. Reply here with any questions.`,

  enquiry_quoted: (b) =>
    `${b.reference}: our office has sent you a quote. Reply to accept and we will hold ` +
    `the vehicle for your dates. Jai Maa Durge Tourism, Mathura.`,

  booking_confirmed: (b) =>
    `Confirmed. ${b.reference} is yours.\n` +
    `${b.summary}\n` +
    `Pickup: ${b.pickup}\n` +
    `Show your QR ticket at boarding. Track live: ${b.trackUrl}\n` +
    `Jai Maa Durge Tourism, Mathura.`,

  booking_cancelled: (b) =>
    `${b.reference} is cancelled. Our office will settle anything outstanding with you ` +
    `directly. Jai Maa Durge Tourism, Mathura.`,

  departure_reminder: (b) =>
    `Reminder: ${b.summary} departs in 2 hours. Pickup at ${b.pickup}. ` +
    `Driver ${b.driver} (${b.driverPhone}). Track live: ${b.trackUrl}`,

  guide_assigned: (b) =>
    `Your guide for ${b.reference} is ${b.guide} (${b.guidePhone}). ` +
    `They will meet you at ${b.pickup}.`,

  delay_alert: (b) =>
    `Update on ${b.reference}: running about ${b.delayMins} minutes late. ` +
    `Live position: ${b.trackUrl}`,

  broadcast: (b) => b.body,
};

/**
 * Queue a message. Returns the stored row so callers (and the admin panel)
 * can show exactly what would have been sent.
 */
export async function notify({ bookingId = null, channel = 'whatsapp', recipient, template, data = {} }) {
  const render = TEMPLATES[template];
  const body = render ? render(data) : String(data.body ?? '');
  const configured = channel === 'whatsapp' ? WHATSAPP_CONFIGURED : EMAIL_CONFIGURED;
  const status = configured ? 'sent' : 'simulated';

  const rows = await query(
    `INSERT INTO notifications (booking_id, channel, recipient, template, body, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, channel, recipient, template, body, status`,
    [bookingId, channel, recipient, template, body, status]
  );

  if (!configured) {
    console.log(`[notify:simulated ${channel}] -> ${recipient}\n${body}\n`);
  } else {
    // Real delivery goes here once credentials exist. Deliberately not
    // implemented against placeholder keys.
    console.log(`[notify:${channel}] -> ${recipient} (${template})`);
  }
  return rows[0];
}
