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

  {
    id: 'RA-SE-03',
    title: 'What I’m most proud of building',
    kind: 'model-answer',
    questionId: 'SE-03',
    scope: SE,
    status: 'approved',
    text: `The thing I’m most proud of building is tiered quoting for our insurance quotes on price comparison websites.

Before, we returned a single quote, so on a comparison site we showed up as one line among many. I built the change that let us return several tiers at once, for example basic, standard and premium cover, each with its own price.

I built it end to end. On the backend, in Python, I changed the quote service to price several tiers for one request. On the frontend, I built how those tiers were shown and compared.

The result was that we were much more visible on the comparison sites, and click-through went up by thirty-four per cent.

I’m proud of it because it moved a real business number, and because I owned it from the first line of backend code to the screen the customer saw.`,
  },
  {
    id: 'RA-SE-04',
    title: 'A time I failed',
    kind: 'model-answer',
    questionId: 'SE-04',
    scope: SE,
    status: 'approved',
    text: `When I first released tiered quoting, I didn’t load test it properly on staging.

Tiering meant that instead of requesting one quote, we were now requesting three or four at the same time. In production, that extra load caused timeouts, and some requests were dropped completely.

We rolled the release back straight away, so customers were back on the old, stable journey. Then I traced the requests to find where the bottlenecks were, fixed them, and optimised the code to handle the extra calls. When it went out again, it was stable.

The lesson was simple. When a change multiplies the work a system has to do, I pressure test it before it reaches customers. Now, whenever a change increases traffic or load, a staging load test is part of my definition of done.`,
  },
  {
    id: 'RA-SE-05',
    title: 'A conflict with a colleague',
    kind: 'model-answer',
    questionId: 'SE-05',
    scope: SE,
    status: 'approved',
    text: `I had a disagreement with our product manager during an A/B test. We were comparing a new quote journey with the current one, and measuring conversion to see which performed better.

At the same time, I’d finished a feature for one of the steps in that journey. Product wanted it live straight away. I wanted to wait until the experiment ended, because changing the journey halfway through would affect the data we had already collected, and we might not be able to trust the result.

I understood why product wanted it out. The feature was ready, and it was valuable. So instead of just saying no, I suggested we merge it behind a feature flag. The code would be in production and ready, but switched off until the experiment finished.

Product agreed. The experiment ran cleanly, we got a result we could trust, and we turned the feature on when it ended. Product got their feature, and we kept the data intact.`,
  },
  {
    id: 'RA-SE-06',
    title: 'How I stay current',
    kind: 'model-answer',
    questionId: 'SE-06',
    scope: SE,
    status: 'approved',
    text: `I stay current through a mix of things. Mostly YouTube, plus podcasts and a few developers I follow on Instagram.

I focus on the tools I use every day, so I follow what’s happening in React, Next.js and TypeScript, especially new features, performance improvements and the best practices that are starting to emerge.

When something looks useful, I try it on a small project first, so I understand the trade-offs before I suggest it at work.

And I learn a lot from my colleagues. Talking through how someone else solved a problem, or reading their code in a review, often teaches me more than any video.`,
  },
  {
    id: 'RA-SE-07',
    title: 'How I handle stress and pressure',
    kind: 'model-answer',
    questionId: 'SE-07',
    scope: SE,
    status: 'approved',
    text: `I think pressure is part of working in software, especially with deadlines, changing requirements and technical problems nobody expected.

The way I handle it is by staying organised and focusing on what I can control.

If I can see that something might affect a deadline, I raise it with the team early. I’d much rather talk through options while there’s still time than wait until it becomes a bigger problem.

I also try not to let pressure lower the quality of my work. If we’re working towards a tight release, I focus on delivering the most important functionality first, without cutting corners that would cause bigger problems later.

And afterwards, I look at what caused the pressure. Often it means something went wrong earlier, like an estimate that was too optimistic, or scope that grew. So I try to fix that in how we plan next time.`,
  },

  // More engineering model answers
  {
    id: 'RA-U-07',
    title: 'Why I want to work here',
    kind: 'model-answer',
    questionId: 'U-07',
    scope: {},
    status: 'approved',
    text: `There are three reasons I want to work here.

The first is the product. It’s used by a lot of people every day, and the kind of work I enjoy most is making a product like that faster, simpler and more reliable for the people who depend on it.

The second is how you work. From what I’ve read and heard in this process, your engineers own features end to end, from the backend to what the customer sees, and you make decisions based on data. That’s how I’ve worked best, for example when I built tiered quoting across our Python backend and the frontend.

The third is growth. I want to keep getting better at system design and at leading work across teams, and this role would stretch me in both.

So for me, it’s the right product, the right way of working, and the right next step.`,
  },
  {
    id: 'RA-SE-08',
    title: 'Delivering bad news to a stakeholder',
    kind: 'model-answer',
    questionId: 'SE-08',
    scope: SE,
    status: 'approved',
    text: `First, I try not to think of information as good or bad. It’s data and facts, and my job is to share it early, clearly, and with a plan.

When I was building tiered quoting, we found late in testing that one of the comparison sites needed changes on their side before they could show several tiers from us. That meant our launch date would slip by about two weeks, and product had already told the business the date.

I didn’t wait to see if it would sort itself out. I spoke to our product manager the same day. I explained what we had found, what it meant for the launch, and what I proposed: go live on the sites that were ready, and add the last one as soon as they were done.

She wasn’t happy about the delay, but she had time to reset expectations, and she agreed to the phased launch. We went live on time on most sites, and the last one followed shortly after.

What I’ve learned is that people can deal with a problem. What they can’t deal with is a surprise.`,
  },
  {
    id: 'RA-SE-09',
    title: 'Working with a cross-functional team',
    kind: 'model-answer',
    questionId: 'SE-09',
    scope: SE,
    status: 'approved',
    text: `Tiered quoting was the most cross-functional project I’ve worked on. It involved product, design, our pricing team, and the comparison sites themselves.

Each group cared about something different. Pricing cared about getting each tier’s price right. Product cared about conversion. Design cared about the customer understanding the difference between tiers. And the comparison sites cared about their own format and rules.

My role was to connect all of that to what we could build. I set up a short weekly check-in, and I kept a single shared page with the decisions we’d made and the questions still open, written in plain language rather than engineering terms.

There was one real clash. Design wanted to show a lot of detail for each tier, but some comparison sites limit what you can display. Instead of picking a side, I got both teams looking at the actual limits together, and we agreed a short version for comparison sites and the full detail on our own site.

We launched with everyone behind the same plan, and click-through went up by thirty-four per cent.`,
  },
  {
    id: 'RA-SE-10',
    title: 'Short-term needs and long-term goals',
    kind: 'model-answer',
    questionId: 'SE-10',
    scope: SE,
    status: 'approved',
    text: `We once needed to launch a new step in our quote journey in time for a marketing campaign. The quickest way was to copy an existing form and adapt it. The better long-term way was to build a shared form component the whole journey could use, but that would have taken longer than we had.

I didn’t think it was right to miss the campaign for the sake of cleaner code, but I also didn’t want to add more copied code that would slow us down later.

So I proposed a middle path. We shipped the quick version on time, and I wrote a ticket for the shared component with a clear reason why it mattered. I agreed with our product manager that we would book it into the next sprint, not leave it for some day.

We hit the campaign date, and the next sprint I built the shared component and moved three forms onto it. After that, changes to forms took far less time, because we only had to make them once.

For me, taking a shortcut is fine, as long as you agree when you’ll pay it back, and then you actually do.`,
  },
  {
    id: 'RA-SE-11',
    title: 'Where I see myself in five years',
    kind: 'model-answer',
    questionId: 'SE-11',
    scope: SE,
    status: 'approved',
    text: `In five years, I see myself as a senior engineer, and ideally leading technical work across a team.

I enjoy working end to end, from the backend to what the customer sees, so I want to get much deeper at system design. I want to be the person who can look at a product and see how it should be built so it’s reliable and easy to change.

I’d also like to be helping other engineers grow, through reviews, pairing and mentoring, the way senior engineers helped me early in my career.

And I want my work to be tied to results the business cares about, like the tiered quoting project that lifted click-through.

This role fits that well. It would give me ownership of real features, and the chance to grow into leading larger pieces of work.`,
  },
  {
    id: 'RA-SE-12',
    title: 'What makes me a good team player',
    kind: 'model-answer',
    questionId: 'SE-12',
    scope: SE,
    status: 'approved',
    text: `I think three things make me a good team player.

First, I share what I know. If I solve a tricky problem, I write it up or walk the team through it, so the next person doesn’t have to solve it again.

Second, I care about the team’s work, not just my own tickets. If someone is blocked, I’d rather pause and help them than finish my task while the team falls behind. I treat code reviews the same way: I review promptly, and I keep my comments kind and useful.

Third, I’m honest. If I make a mistake, I say so early, like when tiered quoting caused timeouts and I led the rollback and the fix. And if I disagree, I say that too, with a reason and an alternative, like the time I suggested a feature flag so we wouldn’t spoil an experiment.

For me, a good team player makes the people around them more effective, and that’s what I try to do.`,
  },
  {
    id: 'RA-SE-13',
    title: 'Managing a project from start to finish',
    kind: 'model-answer',
    questionId: 'SE-13',
    scope: SE,
    status: 'approved',
    text: `I led the move of our quote journey from an older single-page app to Next.js, from the first proposal to the last page going live.

The goal was faster pages and quicker releases. The old app was slow to load on mobile, and small changes were risky.

I started by scoping it. Rather than a big rewrite, I proposed moving one step of the journey at a time, each behind a feature flag, so we could release and roll back safely. I broke it into milestones, agreed the order with product, and shared a simple weekly update.

Halfway through, we found that one step depended on old code that was hard to separate. I flagged it straight away, and we agreed to move that step last, so the rest of the plan wasn’t held up.

We finished with every step on Next.js and no major incidents along the way. Pages loaded noticeably faster, and the team could ship small changes with much more confidence.

If I did it again, I’d look for hidden dependencies like that one at the very start.`,
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
