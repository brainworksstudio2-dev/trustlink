// wa.me links need a full international number with no leading 0 and no
// "+" -- a local Ghana number like "024 240 3450" has to become
// "233242403450". Workers type numbers in whatever format feels natural
// to them (see WorkerRegistrationScreen), so this normalizes at the point
// of use rather than requiring a strict input format at registration.
const GHANA_COUNTRY_CODE = '233';

export function toWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.startsWith(GHANA_COUNTRY_CODE)) return digits;
  if (digits.startsWith('0')) return GHANA_COUNTRY_CODE + digits.slice(1);
  return digits;
}
