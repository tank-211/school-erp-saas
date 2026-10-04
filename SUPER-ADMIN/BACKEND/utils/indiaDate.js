// Subscription dates are DATE columns compared against the India calendar day
// (the school apps block a school the day after expiry_date, India time), so
// "today" and month arithmetic are done on the India date at midnight UTC.

const indiaToday = (now = new Date()) => {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
  return new Date(`${ymd}T00:00:00.000Z`);
};

// Same day N months later, clamped to the month's last day (31 Jan + 1 -> 28/29 Feb)
const addMonthsClamped = (date, months) => {
  const y = date.getUTCFullYear();
  const targetMonth = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, targetMonth, Math.min(date.getUTCDate(), lastDay)));
};

module.exports = { indiaToday, addMonthsClamped };
