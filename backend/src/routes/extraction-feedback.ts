import { Hono } from 'hono';
import { z } from 'zod';
import type { User } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { getLangfuseClient } from '../lib/telemetry';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
};

type Variables = {
  user: User;
};

const count = z.number().int().min(0).max(1000);

const sectionFeedbackSchema = z
  .object({
    extracted: count,
    kept: count,
    edited: count,
  })
  .strict();

const extractionFeedbackSchema = z
  .object({
    facts: sectionFeedbackSchema,
    hotTopics: sectionFeedbackSchema
      .extend({
        datesChanged: count,
        remindersDisabled: count,
      })
      .strict(),
    memories: sectionFeedbackSchema,
    resolvedTopics: z
      .object({
        extracted: count,
        kept: count,
        resolutionsEdited: count,
      })
      .strict(),
    loves: z
      .object({
        extracted: count,
        kept: count,
        added: count,
      })
      .strict(),
    groups: z
      .object({
        suggested: count,
        kept: count,
        added: count,
      })
      .strict(),
    contactInfoEdited: z.boolean(),
    nameEdited: z.boolean(),
    transcriptionEdited: z.boolean(),
  })
  .strict();

export const extractionFeedbackRoutes = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

extractionFeedbackRoutes.use('/*', authMiddleware);

extractionFeedbackRoutes.post('/', async (c) => {
  const parsed = extractionFeedbackSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: 'Invalid feedback payload' }, 400);
  }

  const feedback = parsed.data;
  const user = c.get('user');

  const totalExtracted =
    feedback.facts.extracted +
    feedback.hotTopics.extracted +
    feedback.memories.extracted +
    feedback.resolvedTopics.extracted +
    feedback.loves.extracted;
  const totalKept =
    feedback.facts.kept +
    feedback.hotTopics.kept +
    feedback.memories.kept +
    feedback.resolvedTopics.kept +
    feedback.loves.kept;
  const totalEdited =
    feedback.facts.edited +
    feedback.hotTopics.edited +
    feedback.memories.edited +
    feedback.resolvedTopics.resolutionsEdited;
  const totalAdded = feedback.loves.added + feedback.groups.added;

  const langfuse = getLangfuseClient();
  const trace = langfuse?.trace({
    name: 'extraction-review-feedback',
    userId: user.id,
    metadata: { ...feedback, totalExtracted, totalKept, totalEdited, totalAdded },
  });

  if (trace) {
    if (totalExtracted > 0) {
      trace.score({
        name: 'review-acceptance',
        value: totalKept / totalExtracted,
        comment: `${totalKept}/${totalExtracted} extracted items kept at save`,
      });
    }
    if (totalKept > 0) {
      trace.score({
        name: 'review-edit-rate',
        value: totalEdited / totalKept,
        comment: `${totalEdited}/${totalKept} kept items edited before save`,
      });
    }
    trace.score({
      name: 'review-manual-additions',
      value: totalAdded,
      comment: 'Items the user added manually on the review screen (documented extraction misses)',
    });
  } else {
    console.log('[extraction-feedback]', JSON.stringify({ userId: user.id, ...feedback }));
  }

  return c.json({ success: true });
});
