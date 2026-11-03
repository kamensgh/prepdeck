import { defineField, defineType } from 'sanity';

export const passage = defineType({
  name: 'passage',
  title: 'Read-aloud passage',
  type: 'document',
  description: 'Text people read out loud on the Read aloud page to build fluency.',
  fields: [
    defineField({
      name: 'code',
      title: 'ID',
      type: 'string',
      description: 'Stable ID, e.g. RA-FE-01.',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.required().max(70) }),
    defineField({
      name: 'kind',
      type: 'string',
      options: {
        list: [
          { title: 'Model answer (answers a question)', value: 'model-answer' },
          { title: 'Talk about it (the role or industry)', value: 'talk-about' },
        ],
        layout: 'radio',
      },
      initialValue: 'model-answer',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'question',
      type: 'reference',
      to: [{ type: 'question' }],
      description: 'The question this answers. Shown above the passage.',
      hidden: ({ document }) => document?.kind !== 'model-answer',
      validation: (r) =>
        r.custom((value, { document }) =>
          document?.kind === 'model-answer' && !value ? 'Model answers need a question' : true,
        ),
    }),
    defineField({
      name: 'text',
      type: 'text',
      rows: 14,
      description:
        'Written to be spoken: first person, short sentences. Separate paragraphs with a blank line. Aim for 120–250 words (one to two minutes).',
      validation: (r) => r.required().min(200).max(1800),
    }),
    defineField({
      name: 'scope',
      type: 'object',
      description: 'Same as questions: leave empty for every role. For model answers, match the question’s scope.',
      fields: [
        defineField({ name: 'industry', type: 'reference', to: [{ type: 'industry' }] }),
        defineField({ name: 'roleFamily', type: 'reference', to: [{ type: 'roleFamily' }] }),
        defineField({ name: 'specialisation', type: 'reference', to: [{ type: 'specialisation' }] }),
        defineField({ name: 'stack', type: 'string', description: 'Stack id, e.g. react or nextjs.' }),
      ],
    }),
    defineField({
      name: 'status',
      title: 'Review',
      type: 'string',
      description: 'Only Approved passages appear in the app.',
      options: {
        list: [
          { title: 'To review', value: 'to-review' },
          { title: 'Approved', value: 'approved' },
          { title: 'Needs edit', value: 'needs-edit' },
          { title: 'Drop', value: 'drop' },
        ],
        layout: 'radio',
      },
      initialValue: 'to-review',
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: { title: 'title', code: 'code', status: 'status' },
    prepare: ({ title, code, status }) => ({ title, subtitle: `${code} (${status})` }),
  },
});
