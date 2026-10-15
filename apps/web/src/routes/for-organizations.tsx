import { useEffect, useRef } from "react"
import { createFileRoute } from "@tanstack/react-router"

import "@/styles/for-organizations.css"

export const Route = createFileRoute("/for-organizations")({
  head: () => ({
    meta: [
      { title: "Internity — run every internship with intention" },
      {
        name: "description",
        content:
          "Internity gives teams one calm place to organize interns, publish work, review submissions, and keep every handoff moving.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500&family=Nunito:wght@600;700;800&display=swap",
      },
    ],
  }),
  component: OrganizationsLandingPage,
})

const MARKUP = String.raw`<div class="scroll-sentinel" aria-hidden="true"></div><div class="flavor">
      <!-- prettier-ignore -->
      <svg width="0" height="0" style="position:absolute"><defs>
<symbol id="pebble" viewBox="0 0 20 22"><path d="M10 1.5c4.6 0 8 3.9 8 9.4S14.4 20.5 10 20.5 2 16.5 2 11 5.4 1.5 10 1.5Z"/><path d="M8.5 8.2 10 6.6l1.5 1.6L10 9.8Z"/><path d="M6.6 13.4c1 1.3 2.1 1.9 3.4 1.9"/></symbol>
<symbol id="phone" viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/></symbol>
<symbol id="tab" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M11 18h2"/></symbol>
<symbol id="desk" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></symbol>
<symbol id="clip" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></symbol>
<symbol id="mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></symbol>
<symbol id="tri" viewBox="0 0 10 10"><path d="M2 1v8l7-4Z"/></symbol>
</defs></svg>

      <!-- prettier-ignore -->
      <nav class="nav">
<div class="nav-in">
<a class="mark" href="#"><svg><use href="#pebble"/></svg><span>Internity<sup>&reg;</sup></span></a>
<div class="links"><a href="#platform"><i class="dot"></i>Program</a><a href="#workflow"><i class="dot d-y"></i>Work</a><a href="#questions"><i class="dot d-p"></i>Help</a></div>
<div class="nav-r"><a class="login" href="/sign-in"><i class="dot d-g"></i>Login</a><a class="btn" href="#contact">Start pilot</a><a class="burger" href="#" aria-label="Menu"><svg viewBox="0 0 24 24"><path d="M5 8h14M5 12h14M5 16h14"/></svg></a></div>
</div>
</nav>

      <!-- prettier-ignore -->
      <header class="hero">
<div class="sun"></div>
<h1><span>Run every internship.</span><span>Move every handoff.</span></h1>
<p class="chips">Every <span class="tag c-o">people</span> <span class="tag c-p">assignments</span> <span class="tag c-b">submissions</span> <span class="tag c-r">feedback</span> and <span class="tag c-y">attendance</span> in one clear, shared program.</p>
<div class="plat">
<a href="#"><svg><use href="#phone"/></svg>Intern workspace</a>
<a href="#"><svg><use href="#clip"/></svg>Staff workspace</a>
<a href="#"><svg><use href="#desk"/></svg>Admin console</a>
</div>
<div class="app" aria-hidden="true">
<div class="app-tabs"><span>Program</span><span>Departments</span><b>Progress</b></div>
<div class="app-title">Your program</div>
<div class="thing ph blur" style="--a:var(--fg);--b:var(--ink-soft);--r:-1;top:40px;left:330px;width:110px;height:84px"></div>
<div class="thing blur" style="--r:1;top:150px;left:60px;width:100px;height:130px"></div>
<div class="thing ph blur" style="--a:var(--t-red);--b:var(--t-yellow);--r:-2;top:380px;left:0;width:96px;height:120px"></div>
<div class="thing ph blur" style="--a:var(--sage);--b:var(--seafoam);--r:1;top:60px;right:30px;width:170px;height:130px"></div>
<div class="thing blur" style="--r:-1;top:250px;right:0;width:110px;height:120px"></div>
<div class="thing blur" style="--r:2;bottom:20px;right:130px;width:100px;height:96px"></div>
<div class="thing ph blur" style="--a:var(--sand);--b:var(--t-orange);--r:0;bottom:-30px;left:390px;width:130px;height:110px"></div>
<div class="thing q" style="--r:0;top:110px;left:50%;width:180px;margin-left:-90px">Class Thursday. Bring your draft.</div>
<div class="glass"><span>Bury</span><span>Keep</span></div>
</div>
</header>

      <!-- prettier-ignore -->
      <section class="manifesto">
<p class="eyebrow">Our promise</p>
<p>Internships get complicated in the handoffs: a brief here, a review there, a question waiting in a chat thread.</p>
<p>The work gets scattered by the minute &ndash;</p>
<p>to spreadsheets, inboxes, and calendars that were never designed to show a whole cohort moving together.</p>
<p>Your program should stay clear, shared, and easy to return to. <b>We promise:</b></p>
<ul class="nos">
<li><b>NO</b> systems to stitch together</li>
<li><b>NO</b> status meetings for status meetings</li>
<li><b>NO</b> hidden handoffs</li>
<li><b>NO</b> guesswork about ownership</li>
<li><b>NO</b> context lost between tools</li>
<li><b>NO</b> important work buried</li>
</ul>
</section>
      <!-- prettier-ignore -->
      <section class="welcome">
<h2>Welcome to<span>&hellip;a better cohort.</span></h2>
<a class="btn" href="#">Plan a pilot &rsaquo;</a>
</section>

      <!-- prettier-ignore -->
      <section class="cells" aria-label="Numbers">
<div><b>ONE</b><span>shared program</span></div>
<div><b>ZERO</b><span>lost handoffs</span></div>
<div><b>ALL</b><span>work in context</span></div>
<div><b>CLEAR</b><span>next steps</span></div>
</section>

      <!-- prettier-ignore -->
      <section class="sort">
<div class="head"><h2 class="h2">A program that<br />sorts itself.</h2><p class="sub">Bring in the people, work, and feedback. Internity keeps each piece connected to the place your team will look first.</p></div>
<div class="win" aria-hidden="true">
<em>Search the program&hellip;</em>
<div class="ghost"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
<div class="thing q" style="--r:-1;top:6px;left:120px;width:150px;font-size:15px">The brief is ready. The next review is Thursday.</div>
<div class="thing ph" style="--a:var(--bg-2);--b:var(--border);--r:1;top:-80px;left:240px;width:140px;height:150px"><span class="price">DUE</span></div>
<div class="thing clock" style="--r:-0.5;top:40px;left:370px;width:140px;height:170px"><div><i></i></div></div>
<div class="thing note" style="--r:0.5;top:240px;left:250px;width:170px"><span>Confirm the next review with the supervisor.</span></div>
</div>
<p class="center"><a class="play" href="#"><i><svg><use href="#tri"/></svg></i>See the workflow happen</a></p>
</section>

      <!-- prettier-ignore -->
      <section class="works">
<div class="head"><p class="eyebrow">It just works</p><h2 class="h2">Bring people in. The <span class="pm">program</span> rhythm does the rest.</h2><p class="sub">Invite, publish, review, and keep moving. Internity keeps the context attached so your team can focus on helping people grow.</p></div>
<div class="collage" aria-hidden="true">
<div class="thing ph" style="--a:var(--border);--b:var(--fg-faint);--r:-0.4;top:-20px;left:40px;width:160px;height:210px"></div>
<div class="thing ph" style="--a:var(--fg-muted);--b:var(--fg);--r:0.4;top:0;right:0;width:200px;height:150px"></div>
<div class="thing ph" style="--a:var(--rose);--b:var(--t-orange);--r:0.6;bottom:0;left:0;width:250px;height:170px"></div>
<div class="thing assignment" style="--r:0;top:110px;left:190px;width:290px;height:310px"><b></b></div>
</div>
<p class="center"><a class="play" href="#"><i><svg><use href="#tri"/></svg></i>How to run the next step in two taps</a></p>
</section>

      <!-- prettier-ignore -->
      <section class="band-o">
<div class="head"><p class="eyebrow">No chasing required</p><h2 class="h2">Handoffs are visible. Find the next step quickly.</h2><p class="sub">Search by person, department, assignment, or status. Find the context you need before the next meeting starts.</p><a class="play" href="#"><i><svg><use href="#tri"/></svg></i>Watch the workflow move</a></div>
<div class="search" aria-hidden="true"><span>assignment</span><span>#cohort</span><em>#review</em><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></div>
<div class="res" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
</section>

      <!-- prettier-ignore -->
      <section class="oasis">
<div class="sheet">
<div class="head"><p class="eyebrow">Your program, in one place</p><h2 class="h2">A clear, shared view of everything in motion.</h2></div>
<div class="bento">
<article class="card" style="--bg-c:var(--sand)"><div class="stage"><ul class="receipt"><li class="h">Program rhythm, so remember:</li><li class="x">Invite the new cohort</li><li>Publish the first brief</li><li class="x">Confirm the next review</li><li>Share the meeting link</li><li>Welcome the mentors</li></ul></div><div><h3>Plans without ceremony</h3><p>Keep briefs, notes, and decisions where the team can find them. No extra ceremony.</p></div></article>
<article class="card w" style="--bg-c:var(--mist)"><div class="stage stack"><div class="thing ph" style="--a:var(--fg);--b:var(--ink-soft);--r:-1;top:20px;left:22%;width:120px;height:160px"></div><div class="thing q" style="--r:1;top:90px;left:8%;width:150px;font-size:15px">The review is Friday. Bring the latest brief.</div><div class="thing ph" style="--a:var(--t-blue);--b:var(--bg);--r:0;top:0;right:12%;width:150px;height:210px"></div><div class="thing ph" style="--a:var(--seafoam);--b:var(--fg-faint);--r:-0.5;top:130px;left:42%;width:140px;height:150px"></div></div><div><h3>Work that knows where it belongs</h3><p>Assignments, submissions, and feedback stay connected from day one.</p></div></article>
<div class="r2">
<article class="card" style="--bg-c:var(--sage)"><div class="stage"><div class="reader"><small>program notes</small><b>Weekly program review</b><i></i><i></i><i style="width:80%"></i><i></i><i style="width:60%"></i></div></div><div><h3>Review it together</h3><p>Keep review notes close to the work, while the details are still fresh.</p></div></article>
<article class="card" style="--bg-c:var(--rose)"><div class="stage stack"><div class="ring"></div><div class="thing ph" style="--a:var(--t-red);--b:var(--sand);--r:-1;top:10px;left:14%;width:110px;height:120px"></div><div class="thing ph" style="--a:var(--bg);--b:var(--t-red);--r:1;top:70px;right:10%;width:120px;height:140px"></div><div class="thing ph" style="--a:var(--t-orange);--b:var(--fg);--r:0;top:160px;left:28%;width:110px;height:120px"></div></div><div><h3>Cohorts that build themselves</h3><p>Set the rhythm once. Each new cohort gets the same clear starting point.</p></div></article>
</div>
<div class="tabsc">
<div class="ftabs" role="tablist"><button aria-selected="false">Program pulse</button><button aria-selected="false">Supervisor view</button><button aria-selected="true">Review a submission</button><button aria-selected="false">Attendance record</button></div>
<div class="hl"><div><h3>Keep the useful note</h3><p>Capture the note that will help the intern take the next step, right beside the work.</p></div>
<blockquote>A good review is more than a score. <mark>It gives someone a clear next step they can carry into the next piece of work.</mark><span class="menu"><span>Copy note</span><span>Keep in the program</span><span>Open assignment</span></span></blockquote></div>
</div>
</div>
</div>
</section>

      <!-- prettier-ignore -->
      <section class="trust">
<div class="head"><h2>Built for the people<br />who keep programs moving.</h2></div>
<div class="bubbles">
<figure class="bub" style="--col:2 / span 3;--tail:56%"><blockquote>The whole cohort can see the same next step.</blockquote><figcaption><span class="face" style="--c:var(--t-orange)">IV</span><span>Program lead<small>Illustrative workflow</small></span></figcaption></figure>
<figure class="bub" style="--col:4 / span 3;--tail:30%"><blockquote>Every assignment, review, and class has a place to land.</blockquote><figcaption><span class="face" style="--c:var(--sage)">TR</span><span>Supervisor<small>Illustrative workflow</small></span></figcaption></figure>
<figure class="bub" style="--col:1 / span 3;--tail:22%"><blockquote>I know what is due, what needs review, and who needs a nudge.</blockquote><figcaption><span class="face" style="--c:var(--t-pink)">PA</span><span>Intern<small>Illustrative workflow</small></span></figcaption></figure>
</div>
<a class="more play" href="#"><svg viewBox="0 0 24 24"><path d="M4 12h15m-5-5 5 5-5 5"/></svg>See how it fits your program</a>
</section>

      <!-- prettier-ignore -->
      <section class="cases">
<div class="head"><p class="eyebrow">For every kind of program</p><h2 class="h2">For teams that help people grow.</h2></div>
<div class="utabs" role="tablist"><button aria-selected="true">Program leads</button><button aria-selected="false">HR teams</button><button aria-selected="false">Supervisors</button><button aria-selected="false">Instructors</button><button aria-selected="false">Interns</button></div>
<div class="mood">
<div class="head"><p class="eyebrow ink">Made for program leads</p><h2 class="h2">A program view that<br /><em>assembles itself.</em></h2></div>
<div class="masonry" aria-hidden="true"><i style="height:150px;--a:var(--sage);--b:var(--seafoam)"></i><i style="height:220px;--a:var(--fg-muted);--b:var(--fg)"></i><i style="height:120px;--a:var(--sand);--b:var(--t-orange)"></i><i style="height:200px;--a:var(--seafoam);--b:var(--fg-faint)"></i><i style="height:240px;--a:var(--mist);--b:var(--sage)"></i><i style="height:140px;--a:var(--sage);--b:var(--fg-muted)"></i><i style="height:180px;--a:var(--bg);--b:var(--seafoam)"></i><i style="height:150px;--a:var(--rose);--b:var(--fg-faint)"></i></div>
</div>
</section>

      <!-- prettier-ignore -->
      <section class="pricing">
<div class="head"><p class="eyebrow">Start with the right shape</p><h2 class="h2">Start focused. Grow with clarity.</h2></div>
<div class="plans">
<div class="plan"><h3>Pilot</h3><div class="amt">Talk<span>to us</span></div><p>Map one cohort, bring your current process, and see where Internity creates the most lift.</p><a class="btn grey" href="#">Plan a pilot</a></div>
<div class="plan hot"><h3>Program</h3><div class="amt">Talk<span>to us</span></div><p>Run classes, assignments, submissions, feedback, and attendance in one shared program.</p><a class="btn" href="#">Book a walkthrough</a></div>
<div class="plan"><h3>Organization</h3><div class="amt">Talk<span>to us</span></div><p>Bring multiple departments into a consistent operating rhythm with room to grow.</p><a class="btn grey" href="#">Talk to sales</a></div>
</div>
</section>

      <!-- prettier-ignore -->
      <section class="faq">
<div class="head"><p class="eyebrow">Questions</p><h2 class="h2">Asked, and answered.</h2></div>
<details open><summary>Who is Internity for?</summary><p>Internity is built for organizations running structured internship programs with interns, HR or program leads, supervisors, and instructors.</p></details>
<details><summary>What can our team manage in one place?</summary><p>Departments, invitations, class sessions, assignments, submissions, scores, written feedback, attendance, intern documents, and optional verification workflows.</p></details>
<details><summary>Can we start with one cohort?</summary><p>Yes. A focused pilot is a good way to map your current process, bring in a real cohort, and decide what to expand from there.</p></details>
<details><summary>How do we see it in action?</summary><p>Use the walkthrough link above and bring the shape of your current program. We’ll keep the conversation grounded in your real handoffs.</p></details>
</section>

      <!-- prettier-ignore -->
      <section class="arc">
<a class="mark" href="#"><svg><use href="#pebble"/></svg>Internity</a>
<div class="statements">
<h2 class="h2" style="font-size:cassignment(1.9rem, 1rem + 2.4vw, 3rem)">We’re building a clearer kind of program. One that keeps the work moving so your team can focus on people.</h2>
<p>We keep the program focused.</p>
<p>We’d rather you spend less time chasing context and more time coaching.</p>
</div>
<a class="btn caps" href="#">Book a walkthrough</a>
<small>Start with one cohort. No long setup project.</small>
<div class="cells cap">
<div><i style="--c:var(--accent)"><svg><use href="#phone"/></svg></i><b>People</b><span>Invite</span></div>
<div><i style="--c:var(--t-pink)"><svg><use href="#tab"/></svg></i><b>Classes</b><span>Invite</span></div>
<div><i style="--c:var(--t-blue)"><svg><use href="#clip"/></svg></i><b>Work</b><span>Assign</span></div>
<div><i style="--c:var(--lilac)"><svg><use href="#desk"/></svg></i><b>Feedback</b><span>Review</span></div>
<div><i style="--c:var(--t-yellow)"><svg><use href="#mail"/></svg></i><b>Attendance</b><span>Track</span></div>
</div>
<a class="another" href="#">Looking for another way to start?</a>
</section>

      <!-- prettier-ignore -->
      <footer>
<div class="foot">
<div class="ft">
<div><a class="mark" href="#"><svg><use href="#pebble"/></svg>Internity</a><span class="motto">&middot; Internship programs, with more room to grow.</span></div>
<a class="how" href="#"><b>See how it works</b><span>Internity walkthroughs</span></a>
</div>
<div class="fcols">
<ul><li><a href="#">Why teams choose Internity</a></li><li><a href="#">Pilot options</a></li><li><a href="#">See how it works</a></li><li><a href="#">Internity for organizations</a></li></ul>
<ul><h4>Your workspace</h4><li><a href="#">Intern workspace</a></li><li><a href="#">Classes and sessions</a></li><li><a href="#">Staff workspace</a></li><li><a href="#">Admin console</a></li></ul>
<ul><h4>About Internity</h4><li><a href="#">Our approach</a></li><li><a href="#">Our promise</a></li></ul>
<ul><h4>Help and contact</h4><li><a href="#">Book a walkthrough</a></li><li><a href="#">Workflow guide</a></li><li><a href="#">Sign in</a></li><li><a href="#">Start a pilot</a></li></ul>
</div>
<div class="fl">
<span>&copy; Internity, inc. 2026</span>
<span>Built for thoughtful programs</span>
<span class="status"><i class="dot d-g"></i>Program workspace ready</span>
<ul><li><a href="#">Terms</a></li><li><a href="#">Privacy</a></li><li><a href="#">Questions</a></li></ul>
</div>
</div>
</footer>
    </div>`

function OrganizationsLandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const nav = root.querySelector<HTMLElement>(".nav")
    const onScroll = () => {
      const offset = Math.max(window.scrollY, window.pageYOffset, document.documentElement.scrollTop, document.body.scrollTop)
      nav?.toggleAttribute("data-scrolled", offset > 60)
    }
    window.addEventListener("scroll", onScroll, { passive: true, capture: true })
    document.addEventListener("scroll", onScroll, { passive: true, capture: true })
    onScroll()

    const sentinel = root.querySelector<HTMLElement>(".scroll-sentinel")
    const observer = sentinel && "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => nav?.toggleAttribute("data-scrolled", !entry.isIntersecting), { threshold: 0 })
      : null
    if (observer && sentinel) observer.observe(sentinel)

    const cleanups: Array<() => void> = []
    root.querySelectorAll<HTMLElement>("[role=tablist]").forEach((list) => {
      const tabs = [...list.querySelectorAll<HTMLButtonElement>("button")]
      tabs.forEach((tab) => {
        const onClick = () => tabs.forEach((item) => item.setAttribute("aria-selected", String(item === tab)))
        tab.addEventListener("click", onClick)
        cleanups.push(() => tab.removeEventListener("click", onClick))
      })
    })

    return () => {
      window.removeEventListener("scroll", onScroll, true)
      document.removeEventListener("scroll", onScroll, true)
      observer?.disconnect()
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [])

  return <div ref={rootRef} className="internity-sales" dangerouslySetInnerHTML={{ __html: MARKUP }} />
}


