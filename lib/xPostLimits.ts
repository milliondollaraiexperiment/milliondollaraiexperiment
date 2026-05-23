export const X_POST_MAX_CHARACTERS = Number.parseInt(
  process.env.X_POST_MAX_CHARACTERS ?? "900",
  10,
);

export const X_SUMMARY_POST_MAX_CHARACTERS = Number.parseInt(
  process.env.X_SUMMARY_POST_MAX_CHARACTERS ?? "1200",
  10,
);
