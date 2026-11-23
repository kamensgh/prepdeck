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

I’m also a strong believer in data-driven development. I like decisions to be based on how real users behave, on data and on experiments, rather than on assumptions. For example, when I built tiered quoting for price comparison websites, we measured it properly, and click-through went up by thirty-four per cent.

That’s why this role stands out to me. You’re building a product that a lot of people rely on, and you want someone who can own features end to end and use data to make them better. That’s exactly the work I want to be doing next.`,
  },
  {
    id: 'RA-U-13',
    title: 'My first 30, 60 and 90 days',
    kind: 'model-answer',
    questionId: 'U-13',
    scope: {},
    status: 'approved',
    text: `I think of a successful start in three phases: learning, ownership and improving.

In the first thirty days, the focus is learning. I’d get set up with all the tools, learn the acronyms and how the team works, and start building my network. That means one-to-ones with my teammates and with the people I’ll work with every day, so I understand what they need and how I can help.

From thirty to sixty days, the focus moves to ownership. I’d look at the problems the organisation is trying to solve, both for customers and internally, and find one piece I can own and fix. I’d like to do that alongside someone more experienced, who can guide me on how to approach it and deliver it in a way that fits the company’s culture.

From sixty to ninety days, the focus is improving. I’d look back at the ways of working I’ve picked up so far, ask for feedback, and refine them, so I’m delivering better results and growing into a top performer on the team.

By day ninety, I want to be someone the team relies on, with something real delivered.`,
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

  // System design, every engineering role
  {
    id: 'RA-SE-14',
    title: 'Designing a quote system for comparison sites',
    kind: 'model-answer',
    questionId: 'SE-14',
    scope: SE,
    status: 'approved',
    text: `I’d start with the requirements. A comparison site sends us a customer’s details, and we need to return quotes from several providers within two seconds. If we’re late, the site simply shows everyone else. So speed and reliability matter more than anything.

The core of the design is a quote service that fans out. It validates the request, then calls every provider in parallel, not one after another. Each call gets its own timeout, say one and a half seconds, so one slow provider can’t hold up the rest.

When the timeouts are up, we return whatever we have. A partial answer on time is worth more than a complete answer that arrives too late.

To keep it fast, I’d cache anything that doesn’t change per request, like reference data and provider configuration. I’d put a circuit breaker on each provider, so if one starts failing, we stop calling it for a while instead of waiting on it every time. And every request gets an ID, so retries never create duplicate quotes.

Before launch, I’d load test it at several times normal traffic. I learned that the hard way when tiered quoting multiplied our provider calls.

Finally, I’d monitor response times and error rates per provider, with alerts, so we see a problem before the comparison site does.`,
  },
  {
    id: 'RA-SE-15',
    title: 'Designing a rate limiter',
    kind: 'model-answer',
    questionId: 'SE-15',
    scope: SE,
    status: 'approved',
    text: `First, I’d ask what we’re protecting and who we’re limiting. For a public API, that’s usually per API key, with a looser limit per IP address for requests that aren’t signed in.

For the algorithm, I’d choose a token bucket. Each key has a bucket that refills at a steady rate, and each request takes a token. It allows short bursts but keeps the average under control. A sliding window is a good alternative if we need stricter limits.

The important part is that the API runs on many servers, so the counts can’t live in each server’s memory. I’d keep them in Redis, and update them atomically, for example with a small Lua script, so two servers can’t both let the same request through.

When a client goes over the limit, we return a 429 status with a Retry-After header. On every response, we include headers showing the limit and how many requests are left, so well-behaved clients can slow down on their own.

I’d run the limiter at the API gateway, so bad traffic is stopped before it reaches our services.

And I’d decide what happens if Redis goes down. For most APIs, I’d fail open, letting traffic through and alerting us, because blocking every customer is worse than a short period without limits.`,
  },
  {
    id: 'RA-SE-16',
    title: 'Designing a notification system',
    kind: 'model-answer',
    questionId: 'SE-16',
    scope: SE,
    status: 'approved',
    text: `I’d start by agreeing what we’re sending and how quickly. Password resets need to arrive in seconds. Marketing emails can wait. That difference shapes the whole design.

Other services don’t send notifications themselves. They send an event to a notification API, like “quote ready” for this customer. The API checks the customer’s preferences and opt-outs, picks the right template, and puts a message on a queue for each channel: email, SMS or push.

Workers read from each queue and call the provider for that channel. Using queues means a slow email provider never slows down the service that sent the event, and we can scale each channel on its own. I’d give urgent messages their own queue, so they never wait behind a big marketing send.

Providers fail, so workers retry with increasing delays. After a few attempts, the message goes to a dead-letter queue for us to look at. Every message has an ID, so a retry never sends the same text twice.

I’d also add rate limits per user, so a bug can’t send someone fifty messages in a minute.

Finally, I’d record what happened to every message: sent, delivered, opened or failed. That helps support answer “I never got my email”, and tells us if a provider is having problems.`,
  },
  {
    id: 'RA-SE-17',
    title: 'Designing a real-time chat app',
    kind: 'model-answer',
    questionId: 'SE-17',
    scope: SE,
    status: 'approved',
    text: `I’d begin with scope. Let’s say one-to-one and group chats, message history, and read receipts, for a few million users.

For real-time delivery, each client keeps a WebSocket connection open to a gateway server. Polling would be slow and wasteful. Because users connect to different servers, I’d put a pub/sub layer, such as Redis, between the gateways. When a message arrives, it’s saved, then published to the conversation, and every gateway with a member of that conversation pushes it down.

For storage, I’d partition messages by conversation, so loading a chat’s history is one fast read. Each message gets an ID that increases over time within its conversation, so everyone sees messages in the same order.

Then there are the hard cases. If someone is offline, we send a push notification instead. When their app reconnects, it tells the server the last message it saw, and the server sends everything after that. That catch-up step is what stops messages going missing when a phone loses signal.

Read receipts are just small events that travel the same way, and I’d batch them so they don’t flood the system.

To scale, I’d add gateway servers behind a load balancer, and keep them as simple as possible, with the real logic in services behind them.`,
  },
  {
    id: 'RA-SE-18',
    title: 'Designing an A/B testing and feature flag system',
    kind: 'model-answer',
    questionId: 'SE-18',
    scope: SE,
    status: 'approved',
    text: `I’d split this into three parts: configuration, assignment and measurement.

Configuration is where people create flags and experiments. A flag might be on for five per cent of users. An experiment might split users fifty-fifty between the current quote journey and a new one. This lives in a small service with a database and an audit log of every change.

Assignment has to be fast and stable. Applications keep a cached copy of the configuration, so checking a flag never needs a network call. To decide which group a user is in, we hash their user ID with the experiment’s name. That way, the same user always sees the same version, on every visit and every server, without storing anything.

Measurement is what makes it an experiment. Every time a user sees a version, we log an exposure. Then we log the outcomes we care about, like completed quotes. An analysis job compares the groups and tells us when we have enough data to trust the result.

There are a few rules I’d build in. Don’t change an experiment while it’s running, because it spoils the data. Keep experiments that touch the same screen from overlapping. And always have a kill switch.

I’ve seen why that matters. I once held back a finished feature behind a flag so it wouldn’t spoil a running experiment, and it was the flag that made that possible.`,
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

  // Latest React features
  {
    id: 'RA-RE-10',
    title: 'The React Compiler',
    kind: 'model-answer',
    questionId: 'RE-10',
    scope: { ...SE, stack: 'react' },
    status: 'approved',
    text: `The React Compiler is a build-time tool that memoises your components for you.

Before, if a component re-rendered too often, we reached for useMemo, useCallback and React.memo by hand. That was easy to get wrong. Miss one dependency and you get a bug, add too many and the code is hard to read.

The compiler looks at your code when you build, and adds that memoisation automatically, at a finer level than most of us would by hand. So in most components, I no longer write useMemo or useCallback at all. The code is simpler, and re-renders are cheaper.

It does rely on the Rules of React. Components need to be pure, and you can’t mutate props or state. The ESLint plugin points out code the compiler can’t optimise, which is useful on its own.

You can adopt it gradually, and if one component causes trouble, the "use no memo" directive opts it out. In Next.js, it’s one setting, reactCompiler, in the config.

It isn’t magic, though. It won’t fix a slow algorithm or a huge list. I still measure with the profiler first.`,
  },
  {
    id: 'RA-RE-11',
    title: 'Actions and useActionState',
    kind: 'model-answer',
    questionId: 'RE-11',
    scope: { ...SE, stack: 'react' },
    status: 'approved',
    text: `In React 19, an Action is an async function that runs inside a transition, usually to submit or change data.

The simplest way to use one is to pass it to a form’s action prop. React then handles the parts we used to write by hand: it tracks the pending state, and it resets the form when the action succeeds.

useActionState builds on that. You give it an action and an initial state, and it gives you back three things: the current state, a wrapped action to pass to the form, and an isPending flag. The action receives the previous state and the form data, and whatever it returns becomes the new state. That’s a clean place to return validation errors or a success message.

For a submit button deep inside a form, useFormStatus reads whether its parent form is pending, without passing props down.

The real benefit shows with Server Functions in Next.js. The form can work before JavaScript has even loaded, and once it has, React takes over smoothly. In practice, a lot of my old onSubmit handlers with preventDefault and three bits of useState just disappear.`,
  },
  {
    id: 'RA-RE-12',
    title: 'useOptimistic',
    kind: 'model-answer',
    questionId: 'RE-12',
    scope: { ...SE, stack: 'react' },
    status: 'approved',
    text: `useOptimistic lets you show the result of an action straight away, before the server has confirmed it.

Take a like button. Without it, the user taps, waits for the request, and only then sees the count go up. With useOptimistic, the count goes up immediately, and the real request happens in the background.

You give it the current state, and it returns an optimistic version of that state plus a function to update it. You call that function inside an action or a transition. While the action is running, the UI shows the optimistic value. When it finishes, React switches back to the real state, which now includes the change. If the action fails, the optimistic value simply disappears, so the UI goes back to the truth.

I use it for quick, reliable actions, like likes, sending a message, or toggling a setting.

I wouldn’t use it for things that often fail, or that take a long time, like a payment. And when it does fail, I still tell the user, because quietly undoing their change is confusing.`,
  },
  {
    id: 'RA-RE-13',
    title: 'The Activity component',
    kind: 'model-answer',
    questionId: 'RE-13',
    scope: { ...SE, stack: 'react' },
    status: 'approved',
    text: `Activity lets you hide part of the UI without throwing away its state.

Normally, to hide something, we render it conditionally. When it’s hidden, it unmounts, so its state is lost. If a user types into a form on one tab, switches tabs and comes back, the form is empty.

With Activity, you wrap that part of the UI and set its mode to visible or hidden. When it’s hidden, React doesn’t show it, and it cleans up its effects, so things like subscriptions stop. But it keeps the component’s state. When you switch it back to visible, the state is still there, and the effects start again.

React also keeps rendering hidden content in the background, at a low priority, so it never slows down what the user is looking at.

That opens up two useful patterns. One is tabs or panels that remember where you were. The other is pre-rendering the screen a user is likely to open next, so it appears instantly when they get there.

It’s different from just hiding something with CSS, because with CSS the effects would keep running.`,
  },
  {
    id: 'RA-RE-14',
    title: 'useEffectEvent',
    kind: 'model-answer',
    questionId: 'RE-14',
    scope: { ...SE, stack: 'react' },
    status: 'approved',
    text: `useEffectEvent solves a long-standing problem with effects: needing the latest value of something without re-running the effect when it changes.

Here’s the classic example. A chat room component connects to a room in an effect, and when the connection opens, it shows a notification in the current theme. The theme has to be in the dependency list, so every time the user switches between light and dark mode, the effect disconnects and reconnects. That’s wrong. The connection should only depend on the room.

With useEffectEvent, I move the notification logic into an effect event. It always sees the latest theme, but it isn’t a dependency. So the effect only depends on the room ID, and changing the theme no longer reconnects.

The way I think about it is that it separates the parts of an effect that should react to changes from the parts that just need to read the latest values.

There are two rules. Only call an effect event from inside an effect, never during rendering. And don’t use it just to quiet the lint warning. If a value really should restart the effect, it belongs in the dependencies.`,
  },

  // Latest Next.js features
  {
    id: 'RA-NX-10',
    title: 'Cache Components and use cache',
    kind: 'model-answer',
    questionId: 'NX-10',
    scope: { ...SE, stack: 'nextjs' },
    status: 'approved',
    text: `Cache Components is the newer caching model in Next.js, and the big change is that it flips the default.

You turn it on with the cacheComponents option. From then on, data fetching is dynamic by default, and you choose what to cache. Before, a lot was cached implicitly, and people were often surprised by stale data.

You opt in with the "use cache" directive. You can put it at the top of a page, a component or a function, and Next.js caches its result. cacheLife sets how long the result stays fresh, and cacheTag gives it a name, so you can invalidate it later when the data changes.

The payoff is that one route can mix static and dynamic content. Next.js prerenders a static shell, with the layout and all the cached parts, and serves it immediately. Anything dynamic, like a user’s basket, sits behind a Suspense boundary and streams in when it’s ready.

One thing to watch: you can’t read cookies or headers inside a cached function, because the result is shared. So I read them outside, and pass the values in as arguments.`,
  },
  {
    id: 'RA-NX-11',
    title: 'proxy.ts and middleware',
    kind: 'model-answer',
    questionId: 'NX-11',
    scope: { ...SE, stack: 'nextjs' },
    status: 'approved',
    text: `In Next.js 16, middleware was renamed to proxy. The file is now proxy.ts, and the function you export is called proxy.

What it does is the same. It runs on the server before a route is rendered, and it can redirect, rewrite to a different path, set headers or cookies, or respond directly. A matcher in its config controls which paths it runs on.

The rename is about clarity. The word middleware made people think it worked like Express middleware, deep inside the app, so they put far too much in it. Proxy makes it clear that it sits in front of the app, at the network boundary, and can even run separately from it.

It also now defaults to the Node.js runtime, so you have full Node APIs.

I keep proxy light. It’s good for redirects, locale handling, and quick checks, like sending a user to the sign-in page if they have no session cookie. But real authorisation, checking what a user is allowed to do, still happens where the data is read. And because it may run separately from the app, I don’t rely on shared modules or global state in it.`,
  },
  {
    id: 'RA-NX-12',
    title: 'updateTag, revalidateTag and refresh',
    kind: 'model-answer',
    questionId: 'NX-12',
    scope: { ...SE, stack: 'nextjs' },
    status: 'approved',
    text: `All three are about showing fresh data after something changes, but they behave differently.

updateTag is for when a user changes something and needs to see it straight away. Say they edit their profile. In the Server Action, I call updateTag with the profile’s cache tag. It expires the data immediately, so the next request waits for fresh data instead of showing the old version. It only works in Server Actions.

revalidateTag is for when a short delay is fine, like a blog post updated in a CMS. It marks the data as stale. The next visitor still gets the cached version while fresh data loads in the background, which keeps things fast. The recommended second argument is the "max" profile. It also works in Route Handlers, so it’s what I’d call from a CMS webhook. In my own side project, a webhook calls it whenever a question is edited in the CMS.

refresh doesn’t touch the cache at all. Called in a Server Action, it refreshes the client router, so the current page re-renders with up-to-date server data.

So, roughly: the user’s own change, updateTag. Content updated elsewhere, revalidateTag. Just re-render the page, refresh.`,
  },
  {
    id: 'RA-NX-13',
    title: 'Turbopack in Next.js 16',
    kind: 'model-answer',
    questionId: 'NX-13',
    scope: { ...SE, stack: 'nextjs' },
    status: 'approved',
    text: `In Next.js 16, Turbopack became the default bundler, for both next dev and next build. Before, it was something you opted into.

Turbopack is written in Rust, and it’s designed for speed. In practice, the dev server starts much faster, and Fast Refresh, where the page updates as you save, feels close to instant, even on big projects.

For most apps, the switch needs no work at all. You upgrade and it’s simply faster.

The thing to check is custom webpack configuration. If a project has its own webpack loaders or plugins, those don’t carry over automatically. You can either move them to Turbopack’s own configuration, or keep using webpack for now with the --webpack flag. Webpack hasn’t been removed.

So when I upgrade a project, I look for a webpack section in the Next config first, check that each plugin has a Turbopack equivalent, and run a full build to compare the output before switching over.`,
  },
  {
    id: 'RA-NX-14',
    title: 'Handling errors with catchError',
    kind: 'model-answer',
    questionId: 'NX-14',
    scope: { ...SE, stack: 'nextjs' },
    status: 'approved',
    text: `In Next.js, the classic way to handle errors is an error.js file, which acts as an error boundary for a whole route segment. If anything in that segment throws, the whole segment is replaced by the error screen.

Sometimes that’s too much. If a small widget fails, like a recommendations panel, I don’t want to lose the whole page.

That’s what catchError is for. You call it from a Client Component, and it creates an error boundary you can put around any part of the tree. You give it a fallback component, which receives the error and a retry function.

It does a few things a hand-written React error boundary wouldn’t. retry re-renders inside a transition, so state outside the boundary is kept. It knows about redirect and notFound, which work by throwing special errors, so it lets them through instead of catching them by mistake. And the error clears automatically when the user navigates to another page.

So my approach is to use error.js as the safety net for each section, and catchError around anything that can fail on its own without breaking the rest of the page.`,
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
