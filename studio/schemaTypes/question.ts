import { defineField, defineType } from 'sanity';

export const question = defineType({
  name: 'question',
  title: 'Question',
  type: 'document',
  fields: [
    defineField({
      name: 'code',
      title: 'ID',
      type: 'string',
      description: 'Stable ID from the question bank, e.g. FE-01 or VA-02.',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'text', title: 'Question', type: 'text', rows: 2, validation: (r) => r.required() }),
    defineField({
      name: 'type',
      type: 'string',
      options: {
        list: [
          { title: 'Behavioural', value: 'behavioural' },
          { title: 'Situational', value: 'situational' },
          { title: 'Technical', value: 'technical' },
          { title: 'Case study', value: 'case-study' },
          { title: 'Role-specific', value: 'role-specific' },
          { title: 'Culture fit', value: 'culture-fit' },
          { title: 'Curveball', value: 'curveball' },
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'level',
      title: 'Lowest level',
      type: 'string',
      options: { list: ['all', 'entry', 'mid', 'senior'], layout: 'radio', direction: 'horizontal' },
      initialValue: 'all',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'scope',
      type: 'object',
      description: 'Leave everything empty for a universal question. Set deeper fields to narrow it.',
      fields: [
        defineField({ name: 'industry', type: 'reference', to: [{ type: 'industry' }] }),
        defineField({ name: 'roleFamily', type: 'reference', to: [{ type: 'roleFamily' }] }),
        defineField({ name: 'specialisation', type: 'reference', to: [{ type: 'specialisation' }] }),
        defineField({ name: 'stack', type: 'string', description: 'Stack id, e.g. react or nextjs.' }),
      ],
    }),
    defineField({
      name: 'tips',
      type: 'object',
      validation: (r) => r.required(),
      fields: [
        defineField({ name: 'asking', title: 'What they’re really asking', type: 'text', rows: 2, validation: (r) => r.required() }),
        defineField({ name: 'hit', title: 'A strong answer covers', type: 'text', rows: 3, validation: (r) => r.required() }),
        defineField({ name: 'avoid', title: 'Avoid', type: 'text', rows: 2, validation: (r) => r.required() }),
        defineField({ name: 'exampleOutline', title: 'Example outline (optional)', type: 'array', of: [{ type: 'string' }] }),
      ],
    }),
    defineField({
      name: 'status',
      title: 'Review',
      type: 'string',
      description: 'Only Approved questions appear in the app.',
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
    defineField({ name: 'version', type: 'string', description: 'Framework version it was written for, e.g. react@19.' }),
    defineField({ name: 'lastReviewed', type: 'date' }),
  ],
  preview: {
    select: { title: 'text', code: 'code', status: 'status' },
    prepare: ({ title, code, status }) => ({ title, subtitle: `${code} (${status})` }),
  },
});
