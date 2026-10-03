import type { Content } from './schema.ts';

/**
 * Development seed. Used when Sanity isn't configured, so the app runs out of the box.
 * The real question bank lives in Sanity; import the full pilot bank with `npm run import:bank`.
 */
export const seedContent: Content = {
  industries: [
    {
      id: 'technology',
      name: 'Technology',
      color: '#6B3BFF',
      blurb: 'Engineering roles, from fundamentals to framework deep-dives.',
    },
    {
      id: 'm-and-a',
      name: 'Mergers & Acquisitions',
      color: '#00A676',
      blurb: 'Deal teams in banking, transaction services and corporate development.',
    },
  ],
  roleFamilies: [
    { id: 'software-engineering', industryId: 'technology', name: 'Software Engineering' },
    { id: 'm-and-a', industryId: 'm-and-a', name: 'M&A' },
  ],
  specialisations: [
    {
      id: 'frontend',
      roleFamilyId: 'software-engineering',
      name: 'Frontend Engineer',
      stacks: [
        { id: 'react', name: 'React' },
        { id: 'nextjs', name: 'Next.js' },
      ],
    },
    { id: 'ma-analyst', roleFamilyId: 'm-and-a', name: 'M&A Analyst', stacks: [] },
    { id: 'ma-associate', roleFamilyId: 'm-and-a', name: 'M&A Associate', stacks: [] },
    { id: 'corp-dev', roleFamilyId: 'm-and-a', name: 'Corporate Development Manager', stacks: [] },
  ],
  questions: [
    // Universal
    {
      id: 'U-01',
      text: 'Tell me about yourself.',
      type: 'role-specific',
      level: 'all',
      scope: {},
      tips: {
        asking: 'Can you tell a focused story that leads to this role?',
        hit: 'Present → past → why this job, in under two minutes.',
        avoid: 'Reciting your CV line by line.',
      },
      status: 'approved',
    },
    {
      id: 'U-02',
      text: 'Tell me about a time you disagreed with a teammate or manager.',
      type: 'behavioural',
      level: 'all',
      scope: {},
      tips: {
        asking: 'Can you push back respectfully and still commit?',
        hit: 'STAR, the data you used, how you landed it, the relationship afterwards.',
        avoid: 'Making the other person the villain.',
      },
      status: 'approved',
    },
    {
      id: 'U-03',
      text: 'Describe a time you failed or made a significant mistake.',
      type: 'behavioural',
      level: 'all',
      scope: {},
      tips: {
        asking: 'Self-awareness and ownership.',
        hit: "A real mistake, what you did immediately, what you changed so it won't recur.",
        avoid: 'A disguised strength ("I work too hard").',
      },
      status: 'approved',
    },
    {
      id: 'U-07',
      text: 'Why do you want to work here?',
      type: 'culture-fit',
      level: 'all',
      scope: {},
      tips: {
        asking: 'Did you do your homework, and will you stay?',
        hit: 'Two or three specifics about the company tied to your goals.',
        avoid: 'Generic praise or salary.',
      },
      status: 'approved',
    },
    // Frontend fundamentals
    {
      id: 'FE-01',
      text: "Explain the JavaScript event loop. What's the difference between microtasks and macrotasks?",
      type: 'technical',
      level: 'mid',
      scope: { industryId: 'technology', roleFamilyId: 'software-engineering', specialisationId: 'frontend' },
      tips: {
        asking: 'Do you understand async execution order?',
        hit: 'Call stack, task queue, microtask queue drains first (promises), a short ordering example.',
        avoid: 'Saying JS is multi-threaded.',
      },
      status: 'approved',
    },
    {
      id: 'FE-03',
      text: 'Walk me through what happens from typing a URL to the page being interactive.',
      type: 'technical',
      level: 'mid',
      scope: { industryId: 'technology', roleFamilyId: 'software-engineering', specialisationId: 'frontend' },
      tips: {
        asking: 'Breadth across network and browser.',
        hit: 'DNS, TCP/TLS, HTTP, HTML parse, CSSOM, render tree, layout, paint, JS hydration.',
        avoid: 'Going deep on one step and skipping the rest.',
      },
      status: 'approved',
    },
    {
      id: 'FE-06',
      text: 'How do you make a custom dropdown or modal accessible?',
      type: 'technical',
      level: 'mid',
      scope: { industryId: 'technology', roleFamilyId: 'software-engineering', specialisationId: 'frontend' },
      tips: {
        asking: 'Real accessibility practice.',
        hit: 'Semantic HTML first, ARIA roles, focus trap and return, keyboard support, screen-reader testing.',
        avoid: '"Add aria-label" as the whole answer.',
      },
      status: 'approved',
    },
    // React
    {
      id: 'RE-01',
      text: 'How does React decide when to re-render a component?',
      type: 'technical',
      level: 'entry',
      scope: {
        industryId: 'technology',
        roleFamilyId: 'software-engineering',
        specialisationId: 'frontend',
        stack: 'react',
      },
      tips: {
        asking: 'Your mental model of rendering.',
        hit: 'State, props or context change, parent re-render, reconciliation, render vs commit.',
        avoid: 'Confusing a re-render with a DOM update.',
      },
      status: 'approved',
      version: 'react@19',
    },
    {
      id: 'RE-03',
      text: 'Explain useEffect. What are common mistakes with it?',
      type: 'technical',
      level: 'entry',
      scope: {
        industryId: 'technology',
        roleFamilyId: 'software-engineering',
        specialisationId: 'frontend',
        stack: 'react',
      },
      tips: {
        asking: 'Effects as synchronisation, not lifecycle.',
        hit: 'Dependency array, cleanup, "you might not need an effect" (derive state, event handlers).',
        avoid: 'Fetching in effects with no cleanup or race handling.',
      },
      status: 'approved',
      version: 'react@19',
    },
    {
      id: 'RE-08',
      text: 'A page in your React app feels slow. How do you investigate?',
      type: 'situational',
      level: 'mid',
      scope: {
        industryId: 'technology',
        roleFamilyId: 'software-engineering',
        specialisationId: 'frontend',
        stack: 'react',
      },
      tips: {
        asking: 'Your debugging process.',
        hit: 'Reproduce, React Profiler and Performance tab, find the cause, fix, measure again.',
        avoid: 'Jumping straight to memoisation.',
      },
      status: 'approved',
    },
    // Next.js
    {
      id: 'NX-03',
      text: 'When should a component be a Server Component vs a Client Component?',
      type: 'technical',
      level: 'mid',
      scope: {
        industryId: 'technology',
        roleFamilyId: 'software-engineering',
        specialisationId: 'frontend',
        stack: 'nextjs',
      },
      tips: {
        asking: 'Boundary design.',
        hit: 'Default to server, "use client" for interactivity and browser APIs, push the boundary down.',
        avoid: '"use client" at the top of every file.',
      },
      status: 'approved',
    },
    {
      id: 'NX-04',
      text: 'What are Server Actions and what are their risks?',
      type: 'technical',
      level: 'mid',
      scope: {
        industryId: 'technology',
        roleFamilyId: 'software-engineering',
        specialisationId: 'frontend',
        stack: 'nextjs',
      },
      tips: {
        asking: 'Mutations and security.',
        hit: "They're public endpoints: validate input and authorise every call, revalidate after.",
        avoid: "Assuming they're private because they live in server code.",
      },
      status: 'approved',
    },
    // Frontend system design
    {
      id: 'SD-01',
      text: 'Design the frontend for an infinite-scrolling news feed.',
      type: 'technical',
      level: 'senior',
      scope: { industryId: 'technology', roleFamilyId: 'software-engineering', specialisationId: 'frontend' },
      tips: {
        asking: 'Structured frontend system design.',
        hit: 'Requirements first, component tree, pagination, virtualisation, caching, error states, accessibility.',
        avoid: 'Jumping into code before clarifying scope.',
      },
      status: 'approved',
    },
    {
      id: 'SD-06',
      text: 'A release broke checkout for some users. Walk me through your response.',
      type: 'situational',
      level: 'mid',
      scope: { industryId: 'technology', roleFamilyId: 'software-engineering', specialisationId: 'frontend' },
      tips: {
        asking: 'Incident handling.',
        hit: 'Assess scope, roll back or flag off first, communicate, root cause, post-mortem.',
        avoid: 'Debugging live before stopping the impact.',
      },
      status: 'approved',
    },
    // M&A
    {
      id: 'MA-01',
      text: 'Why M&A, and why not another area of finance?',
      type: 'role-specific',
      level: 'entry',
      scope: { industryId: 'm-and-a', roleFamilyId: 'm-and-a' },
      tips: {
        asking: 'Genuine, informed motivation.',
        hit: 'What draws you to deals, and a specific experience that sparked it.',
        avoid: '"It pays well" or a vague love of finance.',
      },
      status: 'approved',
    },
    {
      id: 'MA-02',
      text: 'Walk me through a recent deal you followed.',
      type: 'role-specific',
      level: 'entry',
      scope: { industryId: 'm-and-a', roleFamilyId: 'm-and-a' },
      tips: {
        asking: 'Commercial awareness.',
        hit: 'Parties, size and structure, strategic rationale, synergies, your view on whether it makes sense.',
        avoid: "A deal you can't discuss beyond the headline.",
      },
      status: 'approved',
    },
    {
      id: 'AC-02',
      text: 'Depreciation goes up by £10. Walk me through the impact on the three statements.',
      type: 'technical',
      level: 'entry',
      scope: { industryId: 'm-and-a', roleFamilyId: 'm-and-a' },
      tips: {
        asking: 'Mechanical fluency.',
        hit: 'Pre-tax income −10, net income −7.5 at 25% tax, cash +2.5, PP&E −10, retained earnings −7.5.',
        avoid: 'Forgetting the tax effect.',
      },
      status: 'approved',
    },
    {
      id: 'VA-02',
      text: 'Walk me through a DCF.',
      type: 'technical',
      level: 'entry',
      scope: { industryId: 'm-and-a', roleFamilyId: 'm-and-a' },
      tips: {
        asking: 'The most common technical question.',
        hit: 'Unlevered FCF, terminal value, discount at WACC, sum to EV, bridge to equity value.',
        avoid: 'Skipping the EV-to-equity bridge.',
      },
      status: 'approved',
    },
    {
      id: 'VA-07',
      text: 'Is an acquisition accretive or dilutive? How do you tell quickly?',
      type: 'technical',
      level: 'mid',
      scope: { industryId: 'm-and-a', roleFamilyId: 'm-and-a' },
      tips: {
        asking: 'Merger maths.',
        hit: "Compare the acquirer's P/E with the target's, or the cost of each funding source.",
        avoid: 'Saying accretion means a good deal.',
      },
      status: 'approved',
    },
    {
      id: 'DP-04',
      text: "Locked box vs completion accounts: what's the difference?",
      type: 'technical',
      level: 'mid',
      scope: { industryId: 'm-and-a', roleFamilyId: 'm-and-a' },
      tips: {
        asking: 'SPA price mechanisms.',
        hit: 'Fixed price with leakage protection vs post-completion true-up; who bears risk and when each suits.',
        avoid: 'Mixing up leakage and true-up.',
      },
      status: 'approved',
    },
    {
      id: 'SM-04',
      text: 'Why do so many acquisitions fail to create value?',
      type: 'curveball',
      level: 'all',
      scope: { industryId: 'm-and-a', roleFamilyId: 'm-and-a' },
      tips: {
        asking: 'Critical thinking.',
        hit: 'Overpaying, optimistic synergies, culture clash, poor integration, distraction from the core.',
        avoid: 'Giving only one reason.',
      },
      status: 'approved',
    },
  ],
};
