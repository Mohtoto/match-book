import dotenv from "dotenv";

const baseResult = dotenv.config({
  path: ".env",
});

const productionResult = dotenv.config({
  path: ".env.production",
});

const localResult = dotenv.config({
  path: ".env.local",
});

/**
 * Drop keys that are present but empty.
 *
 * A later file is meant to override an earlier one, but a key left blank —
 * `DATABASE_URL=` with nothing after it — is not an override, it is an unfilled
 * placeholder. Letting it win silently replaced a working connection string
 * with an empty one, which then fell back to localhost and failed with
 * ECONNREFUSED a long way from the cause.
 *
 * Note this differs from how `drizzle.config.ts` loads the same files: plain
 * `dotenv.config` never overrides an already-set variable, so the *first* file
 * wins there. Keeping empty values out of the merge is what makes the two paths
 * agree on which database they are talking to.
 */
function withoutEmptyValues(parsed: dotenv.DotenvParseOutput | undefined) {
  if (!parsed) return {};

  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value.trim() !== "")
  );
}

process.env = {
  ...process.env,
  ...withoutEmptyValues(baseResult.parsed),
  ...withoutEmptyValues(productionResult.parsed),
  ...withoutEmptyValues(localResult.parsed),
};
