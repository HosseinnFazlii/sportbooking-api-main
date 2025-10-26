// src/entities/transformers.ts
// Shared TypeORM column transformers.
export const numericColumnTransformer = {
  to(value?: number | null): number | null | undefined {
    if (value === undefined) return undefined;
    return value === null ? null : value;
  },
  from(value?: string | null): number | null | undefined {
    if (value === null || value === undefined) return value as null | undefined;
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  },
};
