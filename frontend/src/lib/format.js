const DAYS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' };
const ORDER = Object.keys(DAYS);
const NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const dayName = (n) => NAMES[n] ?? '';
export function formatDays(csv) {
    const list = csv.split(',').map((s) => s.trim()).filter(Boolean);
    const idx = list.map((d) => ORDER.indexOf(d));
    const consecutive = idx.length > 2 && idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
    if (consecutive)
        return `${DAYS[list[0]]} to ${DAYS[list[list.length - 1]]}`;
    return list.map((d) => DAYS[d] ?? d).join(', ');
}
export function formatTime(t) {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
export const formatFee = (rupees) => `₹${rupees.toLocaleString('en-IN')}`;
// CMS values are plain text, but links must still be restricted to https.
export function safeUrl(u) {
    try {
        const url = new URL(u);
        return url.protocol === 'https:' ? url.href : null;
    }
    catch {
        return null;
    }
}
// "English | Arabic" lines (Arabic optional) -> [{ en, ar }]
export function parseBilingualLines(text) {
    return (text ?? '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
        const [en, ar] = l.split('|').map((x) => x.trim());
        return { en, ar: ar || null };
    });
}
