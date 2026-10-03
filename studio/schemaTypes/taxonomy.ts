import { defineField, defineType } from 'sanity';

export const industry = defineType({
  name: 'industry',
  title: 'Industry',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'name' }, validation: (r) => r.required() }),
    defineField({
      name: 'color',
      type: 'string',
      description: 'Hex colour for this industry’s cards, e.g. #6B3BFF. Check contrast with white text.',
      validation: (r) => r.required().regex(/^#[0-9a-fA-F]{6}$/),
    }),
    defineField({ name: 'blurb', type: 'string', validation: (r) => r.required().max(90) }),
    defineField({ name: 'order', type: 'number', initialValue: 0 }),
  ],
});

export const roleFamily = defineType({
  name: 'roleFamily',
  title: 'Role family',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'name' }, validation: (r) => r.required() }),
    defineField({ name: 'industry', type: 'reference', to: [{ type: 'industry' }], validation: (r) => r.required() }),
  ],
});

export const specialisation = defineType({
  name: 'specialisation',
  title: 'Role / specialisation',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'name' }, validation: (r) => r.required() }),
    defineField({ name: 'roleFamily', type: 'reference', to: [{ type: 'roleFamily' }], validation: (r) => r.required() }),
    defineField({
      name: 'stacks',
      type: 'array',
      description: 'Frameworks or tools users can toggle, e.g. React, Next.js.',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'id', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
          ],
        },
      ],
    }),
  ],
});
