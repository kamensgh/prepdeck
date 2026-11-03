import type { Passage } from './schema.ts';

const SE = { industryId: 'technology', roleFamilyId: 'software-engineering' } as const;
const MNA = { industryId: 'm-and-a', roleFamilyId: 'm-and-a' } as const;

/**
 * Read-aloud passages. Written to be spoken: first person, short sentences, natural signposting.
 * Model answers follow the matching question's tips so reading them rehearses a strong structure.
 * Paragraphs are separated by a blank line.
 */
export const seedPassages: Passage[] = [
  // Universal
  {
    id: 'RA-U-01',
    title: 'Tell me about yourself',
    kind: 'model-answer',
    questionId: 'U-01',
    scope: {},
    status: 'approved',
    text: `I’m a software engineer with six years’ experience, most recently at an insurance company, where I lead the frontend for our quote journeys. Day to day, that means building the screens customers use to get a price, and making sure they’re fast, accessible and easy to finish.

Before that, I worked at a payments company, which is where I learned to care about reliability. When money is involved, small mistakes are expensive, so I got into the habit of testing carefully and measuring everything.

What I enjoy most is the point where design, data and engineering meet. I like taking a messy problem, finding what really matters to the user, and shipping something simple.

That’s why this role stands out to me. You’re rebuilding a product that a lot of people rely on, and you want someone who can lead the frontend and work closely with design. That’s exactly the work I want to be doing next.`,
  },
  {
    id: 'RA-U-02',
    title: 'Disagreeing with your manager',
    kind: 'model-answer',
    questionId: 'U-02',
    scope: {},
    status: 'approved',
    text: `In my last role, my manager wanted to launch a new sign-up flow two weeks early, to line up with a marketing campaign. I disagreed, because our testing showed the new flow was failing for about one in twenty users on older phones.

Rather than just saying no, I pulled together the numbers. I showed how many customers we would lose each day if we launched as it was, and I proposed a middle option: launch on time to most users, and keep older devices on the old flow until the fix was ready.

My manager wasn’t keen at first, but the data made the trade-off clear, and she agreed. We hit the campaign date, and the fix went out four days later.

What I took from it is that disagreement goes best when you bring evidence and an alternative, not just an objection. We still work well together, and she now asks me to sanity-check launch plans early.`,
  },
  {
    id: 'RA-U-03',
    title: 'A time you made a mistake',
    kind: 'model-answer',
    questionId: 'U-03',
    scope: {},
    status: 'approved',
    text: `Early in my career, I pushed a change late on a Friday without waiting for a second review, because I was confident it was small. It broke the password reset email for about two hours before a colleague noticed.

As soon as I realised, I rolled the change back, told my lead exactly what had happened, and helped our support team reply to the customers who had contacted us.

Then I looked at why it had been so easy to make that mistake. We had no automated test for that email, and nothing stopped a merge without review. I added the test, and I suggested a rule that every change needs one approval, however small. The team adopted it the following week.

The lesson for me was that confidence isn’t a safety net. Now, the smaller a change feels, the more carefully I check it.`,
  },
  {
    id: 'RA-U-09',
    title: 'Taking difficult feedback',
    kind: 'model-answer',
    questionId: 'U-09',
    scope: {},
    status: 'approved',
    text: `A year into my current role, my manager told me that in meetings I often jumped straight to solutions before others had finished explaining the problem. She said it made some quieter colleagues stop contributing.

My first reaction was to defend myself, because I thought I was just being efficient. But when I thought about it, I could remember a couple of meetings where people had gone silent after I spoke.

So I changed two things. I started asking at least one question before offering any idea, and when I ran meetings, I went round the room before giving my own view.

A few months later, a colleague mentioned that our planning sessions felt much more open, and two of the best ideas that quarter came from people who had rarely spoken before. I’m still quick to see solutions, but now I hold them back until everyone has been heard.`,
  },
  {
    id: 'RA-U-T1',
    title: 'How I like to work in a team',
    kind: 'talk-about',
    scope: {},
    status: 'approved',
    text: `I work best in a team where people are clear about what they own, and open about what they’re stuck on.

I like to agree early on what done looks like, so we don’t discover different expectations at the end. I share work before it’s finished, because a rough draft reviewed on Tuesday is worth more than a polished one reviewed on Friday.

When something goes wrong, I’d rather talk about the process than the person. Most mistakes come from gaps in how we work, and fixing those helps everyone.

And I think it matters to make other people’s jobs easier. That might mean writing a clear handover note, or taking ten minutes to explain something to a newer colleague. Small habits like that are what make a team fast over time.`,
  },

  // Software engineering, all specialisations
  {
    id: 'RA-SE-01',
    title: 'How I review a pull request',
    kind: 'model-answer',
    questionId: 'SE-01',
    scope: SE,
    status: 'approved',
    text: `When I review a pull request, I start with the why. I read the description and the ticket, so I understand what the change is meant to achieve before I look at a single line of code.

Then I check that it actually works. Is the logic correct, are the edge cases handled, and are there tests that would fail if it broke? After that, I look at readability, because code is read far more often than it’s written.

I try to separate what must change from what’s a matter of taste. I label small suggestions as optional, so the author knows what’s blocking and what isn’t.

And I keep the tone kind. I ask questions rather than give orders, and I always call out something that’s done well. A good review should leave the code better, and the author happier to ask for the next one.`,
  },

  // Frontend
  {
    id: 'RA-FE-01',
    title: 'The JavaScript event loop',
    kind: 'model-answer',
    questionId: 'FE-01',
    scope: { ...SE, specialisationId: 'frontend' },
    status: 'approved',
    text: `JavaScript runs on a single thread, so it can only do one thing at a time. The event loop is how it handles waiting for things, like timers or network requests, without freezing.

Your code runs on the call stack. When you start something asynchronous, the browser handles the waiting, and when it’s ready, a callback is placed in a queue.

There are two main queues. Macrotasks include things like setTimeout and user events. Microtasks include promise callbacks. The key rule is that after each macrotask, the event loop empties the entire microtask queue before it moves on.

So if I log something synchronously, then schedule a setTimeout, then resolve a promise, the order is: the synchronous log first, then the promise callback, then the timeout. Knowing that helps me avoid subtle ordering bugs, and it’s also why a very long chain of microtasks can block rendering.`,
  },
  {
    id: 'RA-FE-06',
    title: 'Making a modal accessible',
    kind: 'model-answer',
    questionId: 'FE-06',
    scope: { ...SE, specialisationId: 'frontend' },
    status: 'approved',
    text: `I start with native HTML where I can. Today, the dialog element gives you a lot for free, including focus handling and the escape key.

If I’m building a custom modal, there are four things I make sure of. First, the right semantics: a role of dialog, with a label that announces its title. Second, focus: when it opens, focus moves inside it, it stays trapped there while it’s open, and when it closes, focus returns to the button that opened it.

Third, the keyboard: escape closes it, and every control can be reached with the tab key in a sensible order. Fourth, the rest of the page is hidden from screen readers while the modal is open, so users don’t get lost behind it.

Then I test it for real, with only a keyboard and with a screen reader, because automated checks catch maybe a third of accessibility problems.`,
  },
  {
    id: 'RA-RE-01',
    title: 'When React re-renders',
    kind: 'model-answer',
    questionId: 'RE-01',
    scope: { ...SE, stack: 'react' },
    status: 'approved',
    text: `A React component re-renders for three main reasons: its own state changes, a context it reads from changes, or its parent re-renders.

That last one surprises people. By default, when a parent renders, all of its children render too, even if their props are the same.

It’s important to separate rendering from updating the page. Rendering just means React calls the component and works out what the UI should look like. It then compares that with the previous result, and only touches the real DOM where something actually changed. So a re-render is often cheap.

When it isn’t cheap, I measure first with the profiler. Then I might move state closer to where it’s used, split a large context, or memoise an expensive child. With the React Compiler, much of that memoisation now happens automatically, so I focus on structure rather than wrapping everything by hand.`,
  },
  {
    id: 'RA-NX-03',
    title: 'Server or Client Components',
    kind: 'model-answer',
    questionId: 'NX-03',
    scope: { ...SE, stack: 'nextjs' },
    status: 'approved',
    text: `In the App Router, components are Server Components by default, and I keep it that way unless I have a reason not to.

Server Components run only on the server. They can fetch data directly and keep secrets safe, and they send no JavaScript to the browser, which keeps pages fast.

I switch to a Client Component when I need interactivity or browser features: state, effects, event handlers, or things like local storage. I mark that file with use client.

The main skill is where you draw that line. I push it as far down the tree as possible. For example, a product page stays on the server, and only the add-to-basket button becomes a client component. The server fetches the data and passes it down as props.

That way, most of the page is fast and static, and the interactive parts are small and focused.`,
  },

  // Backend
  {
    id: 'RA-BE-04',
    title: 'A payment endpoint that is safe to retry',
    kind: 'model-answer',
    questionId: 'BE-04',
    scope: { ...SE, specialisationId: 'backend' },
    status: 'approved',
    text: `Networks fail, so clients will retry. The goal is that retrying a payment never charges the customer twice. The standard way to do that is an idempotency key.

The client generates a unique key for each payment attempt and sends it with the request. On the server, before doing any work, I record that key in the database with a unique constraint, together with the request details.

If the same key arrives again, I don’t process the payment a second time. If the first request finished, I return the saved response. If it’s still in progress, I return a conflict, so the client knows to wait.

I also check that a reused key comes with the same request body, and I set an expiry on stored keys. Finally, I make the call to the payment provider idempotent too, by passing the key through, so the whole chain is safe end to end.`,
  },
  {
    id: 'RA-BE-02',
    title: 'Database indexes and when they hurt',
    kind: 'model-answer',
    questionId: 'BE-02',
    scope: { ...SE, specialisationId: 'backend' },
    status: 'approved',
    text: `An index is a separate data structure, usually a B-tree, that lets the database find rows without scanning the whole table. It works like the index at the back of a book.

Indexes make reads on the indexed columns much faster, especially for filtering, joining and sorting. With a composite index, the order of the columns matters, because the database can only use it from the left.

But indexes aren’t free. Every insert, update and delete has to update each index as well, so a write-heavy table with too many indexes gets slower. They also take up space and memory.

An index can also simply go unused, for example if the column has very few distinct values, or if the query wraps the column in a function.

So I add indexes based on real query patterns, I check the query plan to confirm they’re used, and I remove the ones that aren’t.`,
  },

  // Fullstack
  {
    id: 'RA-FS-03',
    title: 'Where validation should live',
    kind: 'model-answer',
    questionId: 'FS-03',
    scope: { ...SE, specialisationId: 'fullstack' },
    status: 'approved',
    text: `Validation belongs in both places, but for different reasons.

On the client, validation is about the user. It gives instant feedback, like telling someone their email is missing an at sign before they press submit. It makes forms faster and kinder to use.

On the server, validation is about safety. Anything from the browser can be changed or skipped, so the server must treat every request as untrusted and check it again. This is the check that actually protects the data.

To avoid writing the rules twice and letting them drift apart, I define the schema once, for example with Zod, and share it between the form and the API. The server still has rules the client can’t know about, like whether a username is already taken.

So the short answer is: client for experience, server for truth, and one shared schema to keep them in step.`,
  },

  // M&A: HR M&A Manager
  {
    id: 'RA-MP-01',
    title: 'Why HR in M&A',
    kind: 'model-answer',
    questionId: 'MP-01',
    scope: MNA,
    status: 'approved',
    text: `I’m drawn to HR in M&A because it’s where people decisions have the biggest and most immediate impact on whether a deal succeeds.

In a generalist HR role, change happens gradually. In a deal, everything is compressed. You might have weeks to understand a workforce, protect key talent, plan a Day 1, and make sure thousands of people are paid correctly from a new entity.

I enjoy that mix of pace, structure and judgement. There’s the technical side, like employment law, pensions and reward harmonisation. And there’s the human side, like how you tell people their business is being sold, in a way that’s honest and keeps them engaged.

I also like that the work is measurable. Retention of key people, synergies delivered, a clean Day 1. That combination of commercial impact and genuine care for employees is exactly what I want my career to be built on.`,
  },
  {
    id: 'RA-LR-02',
    title: 'Explaining TUPE',
    kind: 'model-answer',
    questionId: 'LR-02',
    scope: MNA,
    status: 'approved',
    text: `TUPE protects employees when a business, or part of one, transfers to a new owner in the UK. It applies to asset deals and to service provision changes, like outsourcing. It doesn’t apply to a share sale, because the employer itself doesn’t change.

When TUPE applies, employees assigned to the business move to the buyer automatically, on their existing terms and with their continuous service.

Both parties have duties to inform, and where measures are planned, consult, the appropriate employee representatives. The seller must also give the buyer employee liability information at least twenty-eight days before the transfer. If they fail to inform and consult, a tribunal can award up to thirteen weeks’ pay per affected employee.

After the transfer, the buyer can’t simply change terms because of the transfer. Changes are only safe for a reason unrelated to the transfer, or for an economic, technical or organisational reason that involves changes in the workforce. Dismissals because of the transfer are automatically unfair, unless one of those reasons applies.`,
  },
  {
    id: 'RA-CC-01',
    title: 'Announcement day for a business being sold',
    kind: 'model-answer',
    questionId: 'CC-01',
    scope: MNA,
    status: 'approved',
    text: `On announcement day, employees want answers to three questions: what’s happening, what does it mean for me, and when will I know more.

So the message should be clear and human. It explains the sale and the reason for it, in plain language. It’s honest about what’s known and what isn’t yet, and it never promises things the deal can’t guarantee, like no job changes.

It tells people what stays the same for now, which is usually their job, their manager and their pay. And it sets out what happens next, including any consultation, and roughly when they’ll hear more.

How it’s delivered matters as much as the words. Leaders should tell their own teams, ideally in person, before any press release. Managers need a briefing pack and an FAQ beforehand. And there should be a clear place for questions, followed by regular updates, even when the update is that nothing has changed yet.`,
  },
  {
    id: 'RA-M-T1',
    title: 'What an HR M&A manager does',
    kind: 'talk-about',
    scope: MNA,
    status: 'approved',
    text: `An HR M&A manager makes sure the people side of a deal is understood, priced and delivered.

Before signing, that means due diligence. We look at the workforce, contracts, pensions, pay and any employment risks, and we explain how they affect the price or the terms of the deal.

Between signing and completion, we plan. We work out how employees will transfer, what consultation is needed, which key people must be retained, and what HR services the business will need on Day 1, sometimes through a transitional services agreement.

After completion, we deliver. That includes harmonising pay and benefits, designing the new organisation, running fair selection where roles change, and helping two cultures work as one.

Throughout, we communicate. A deal is a time of real uncertainty for employees, and clear, honest communication is one of the biggest factors in keeping people engaged and the deal on track.`,
  },
];
