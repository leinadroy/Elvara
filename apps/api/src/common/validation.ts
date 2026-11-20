import { StandardSchemaValidationPipe } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { validationFailed } from './api-exception.filter.js';

function pathKey(issue: StandardSchemaV1.Issue): string {
  return (issue.path ?? [])
    .map((p) => (typeof p === 'object' && p !== null && 'key' in p ? String(p.key) : String(p)))
    .join('.');
}

/** Validasi skema Zod (@Body({ schema }) / @Query({ schema })) → 422 dengan fieldErrors per field. */
export function createValidationPipe() {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues) => {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of issues) {
        const key = pathKey(issue) || '_';
        (fieldErrors[key] ??= []).push(issue.message);
      }
      return validationFailed('Periksa kembali isian yang ditandai.', fieldErrors);
    },
  });
}
