// Output shape for the recommendations Edge Function. Snake_case at the wire
// because the same shape ships into `public.recommendations.items` (jsonb)
// without rekey churn; the browser hook (`use-recommendations.js`) maps to
// camelCase before consumers see it.

export type RecommendationItem = {
  tmdb_id: number;
  score: number;
  reason: string | null;
};

export type Output = {
  items: RecommendationItem[];
  computed_from_event_count: number;
  cold_start: boolean;
};

// Hand-written assertion so the function double-checks its own output before
// serializing. Catches algorithm regressions (NaN scores, missing fields,
// out-of-range tmdb_ids) at the boundary instead of letting the DB upsert or
// the browser hook surface them. No external schema lib — keeps cold-start
// fast and avoids a third-party dep on the hot path.
export function validateOutput(value: unknown): asserts value is Output {
  if (!value || typeof value !== "object") {
    throw new Error("validateOutput: not an object");
  }
  const o = value as Record<string, unknown>;

  if (typeof o.cold_start !== "boolean") {
    throw new Error("validateOutput: cold_start must be boolean");
  }
  if (
    typeof o.computed_from_event_count !== "number" ||
    !Number.isInteger(o.computed_from_event_count) ||
    o.computed_from_event_count < 0
  ) {
    throw new Error(
      "validateOutput: computed_from_event_count must be a non-negative integer",
    );
  }

  if (!Array.isArray(o.items)) {
    throw new Error("validateOutput: items must be an array");
  }
  // Hard cap mirrors the public.recommendations CHECK constraint (spec 16).
  if (o.items.length > 50) {
    throw new Error("validateOutput: items length exceeds 50");
  }

  for (let i = 0; i < o.items.length; i++) {
    const item = o.items[i] as Record<string, unknown> | null | undefined;
    if (!item || typeof item !== "object") {
      throw new Error(`validateOutput: items[${i}] is not an object`);
    }
    if (
      typeof item.tmdb_id !== "number" ||
      !Number.isInteger(item.tmdb_id) ||
      item.tmdb_id <= 0
    ) {
      throw new Error(
        `validateOutput: items[${i}].tmdb_id must be a positive integer`,
      );
    }
    if (typeof item.score !== "number" || !Number.isFinite(item.score)) {
      throw new Error(`validateOutput: items[${i}].score must be a finite number`);
    }
    if (item.reason !== null && typeof item.reason !== "string") {
      throw new Error(`validateOutput: items[${i}].reason must be string or null`);
    }
  }
}
