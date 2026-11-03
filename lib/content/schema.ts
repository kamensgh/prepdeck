import { z } from 'zod';

export const seniorities = ['entry', 'mid', 'senior'] as const;
export const questionTypes = [
  'behavioural',
  'situational',
  'technical',
  'case-study',
  'role-specific',
  'culture-fit',
  'curveball',
] as const;
export const reviewStatuses = ['to-review', 'approved', 'needs-edit', 'drop'] as const;

export const SenioritySchema = z.enum(seniorities);
export const QuestionTypeSchema = z.enum(questionTypes);

export const IndustrySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(), // CSS colour used for this industry's cards and accents
  blurb: z.string(),
});

export const RoleFamilySchema = z.object({
  id: z.string(),
  industryId: z.string(),
  name: z.string(),
});

export const SpecialisationSchema = z.object({
  id: z.string(),
  roleFamilyId: z.string(),
  name: z.string(),
  stacks: z.array(z.object({ id: z.string(), name: z.string() })),
});

export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: QuestionTypeSchema,
  level: z.union([SenioritySchema, z.literal('all')]),
  scope: z.object({
    industryId: z.string().optional(),
    roleFamilyId: z.string().optional(),
    specialisationId: z.string().optional(),
    stack: z.string().optional(),
  }),
  tips: z.object({
    asking: z.string(),
    hit: z.string(),
    avoid: z.string(),
    exampleOutline: z.array(z.string()).optional(),
  }),
  status: z.enum(reviewStatuses),
  version: z.string().optional(),
  lastReviewed: z.string().optional(),
});

export const passageKinds = ['model-answer', 'talk-about'] as const;

/** A passage to read aloud for fluency: a model answer to a bank question, or a short talk on the role. */
export const PassageSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(passageKinds),
  questionId: z.string().optional(), // model answers point at the question they answer
  text: z.string(), // paragraphs separated by a blank line
  scope: QuestionSchema.shape.scope,
  status: z.enum(reviewStatuses),
});

export const ContentSchema = z.object({
  industries: z.array(IndustrySchema),
  roleFamilies: z.array(RoleFamilySchema),
  specialisations: z.array(SpecialisationSchema),
  questions: z.array(QuestionSchema),
  passages: z.array(PassageSchema).default([]),
});

export type Seniority = z.infer<typeof SenioritySchema>;
export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export type Industry = z.infer<typeof IndustrySchema>;
export type RoleFamily = z.infer<typeof RoleFamilySchema>;
export type Specialisation = z.infer<typeof SpecialisationSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Passage = z.infer<typeof PassageSchema>;
export type PassageKind = (typeof passageKinds)[number];
export type Content = z.infer<typeof ContentSchema>;

export const typeLabels: Record<QuestionType, string> = {
  behavioural: 'Behavioural',
  situational: 'Situational',
  technical: 'Technical',
  'case-study': 'Case study',
  'role-specific': 'Role-specific',
  'culture-fit': 'Culture fit',
  curveball: 'Curveball',
};

export const seniorityLabels: Record<Seniority, string> = {
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
};

export const passageKindLabels: Record<PassageKind, string> = {
  'model-answer': 'Model answer',
  'talk-about': 'Talk about it',
};
