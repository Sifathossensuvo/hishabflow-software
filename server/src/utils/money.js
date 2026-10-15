// Money is stored as taka with 2 decimals. Every write goes through these helpers
// (and Mongo's $round) so floating point noise never builds up.
export const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const r3 = (n) => Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;
export const sumBy = (arr, fn) => r2(arr.reduce((s, x) => s + fn(x), 0));

// Builds an update pipeline that adds deltas to numeric fields and rounds the result.
// Usage: Model.updateOne(filter, incPipeline({ dueBalance: 50 }))
export const incPipeline = (deltas, digits = 2) => [
  {
    $set: Object.fromEntries(
      Object.entries(deltas).map(([field, delta]) => [
        field,
        { $round: [{ $add: [{ $ifNull: ['$' + field, 0] }, delta] }, digits] },
      ]),
    ),
  },
];
