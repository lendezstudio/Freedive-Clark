/* Freedive Clark | class and session data.
   Edit this file to update the schedule. Only add sessions the business has confirmed,
   with a full date (YYYY-MM-DD, Asia/Manila). Past dates are hidden automatically. */

window.FC_DATA = {
  updated: "2026-10-19",

  /* Instagram is the verified official channel. Change only to another verified business destination. */
  chatUrl: "https://ig.me/m/freediveclark",
  chatLabel: "Instagram",

  classes: {
    intro: { name: "Introduction to Freediving", kind: "class", short: "Pool class" },
    yacht: { name: "Sunset Yacht Dive", kind: "trip", short: "Trip" },
    fundive: { name: "Fundive All-In Package", kind: "trip", short: "Trip" }
  },

  /* Promotional class fee from the business's "Final Call" graphic: PHP 1,000, gear and pool fee excluded,
     advertised "until November". Hidden automatically after this date. */
  introPromo: { amount: "PHP 1,000", expires: "2026-11-30" },

  sessions: [
    {
      id: "sunset-yacht-dive-2026-10-24",
      classId: "yacht",
      date: "2026-10-24",
      time: "Overnight trip (2 days, 1 night)",
      venue: "Mabini, Batangas",
      price: "PHP 6,299 advertised rate",
      status: "posted"
    }
  ]
};
