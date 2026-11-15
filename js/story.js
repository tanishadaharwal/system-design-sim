// The story script. Each beat fires when the company reaches `users` (or enough days pass).
// Text may be "string" or [shopVariant, rideVariant]. Options describe the IDEA in plain words;
// the concept's real name is revealed afterwards — players discover it, they are not quizzed on it.
(function () {
  const pay = (s, n) => { s.cash -= n; };
  const rep = (s, n) => { s.rep = G.clamp(s.rep + n, 0, 100); };
  const grow = (s, m) => { s.users = Math.max(20, s.users * m); };

  G.CHAPTERS = [
    { title: 'The Garage', sub: 'One server. One database. One you.', goal: 2000,
      objective: 'Launch, survive your first crowd, reach 2,000 users.' },
    { title: 'Product–Market Fit', sub: 'People actually want this. Uh oh.', goal: 50000,
      objective: 'Money arrives and so do the readers, the bots and Friday deploys. Reach 50k users.' },
    { title: 'Hypergrowth', sub: 'Everything that worked at 10k breaks at 100k.', goal: 500000,
      objective: 'Writes, races and double charges. Reach 500k users.' },
    { title: 'The Big Leagues', sub: 'Now outages make the news.', goal: 3000000,
      objective: 'Regions fail, networks split, the monolith creaks. Reach 3M users.' },
    { title: 'Legend', sub: 'One day decides how this story is told.', goal: 9000000,
      objective: ['Prepare for Mega Sale Day.', 'Prepare for New Year’s Eve.'] }
  ];

  G.BEATS = [
    // ───────────────────────── CHAPTER 1 ─────────────────────────
    { id: 'intro', ch: 0, users: 0, title: 'Day one', steps: [
      { say: [
        ['maya', ['I quit my job. You quit your job. We have $2,000, a domain name, and my cousin’s garage. {co} is going to be the place the whole country shops.', 'I quit my job. You quit your job. We have $2,000, a domain name, and my cousin’s garage. {co} is going to be how this whole city gets home.']],
        ['maya', 'I’ll handle customers, investors and snacks. You handle… all of the computers. You don’t have to write the code — just decide how the thing is BUILT.'],
        ['quack', 'Hi. I’m the rubber duck on your desk. Engineers explain problems to me until they solve them. I’ve heard things. I know things. Squeeze me when you’re stuck.'],
        ['quack', 'First decision, and it’s a big one: where does the data live?']
      ] },
      { choose: { who: 'quack', prompt: ['Where will {co} keep its orders, products and payments?', 'Where will {co} keep its riders, drivers and trips?'],
        hint: ['Money and stock counts must always add up. Which option is obsessive about rules?', 'Trips and payments must add up. Which option is obsessive about rules?'],
        options: [
          { label: 'Strict tables with rules', desc: 'Every record fits a schema. Changes happen all-or-nothing. Harder to scale sideways later.', tags: ['Safe', 'Rigid'],
            fx: (s) => { s.flags.sql = true; }, verdict: 'great', learn: ['sqlnosql', 'acid'],
            out: 'You pick a relational database. Boring, battle-tested, obsessive about correctness. Quack nods. Ducks cannot nod. And yet.', note: 'Boring and correct. Ideal when money is involved.' },
          { label: 'Flexible documents', desc: 'Store anything, change shape any time, scales out easily. Guarantees are looser.', tags: ['Fast to build', 'Looser guarantees'],
            fx: (s) => { s.flags.nosql = true; }, verdict: 'ok', learn: ['sqlnosql', 'acid'],
            out: 'You pick a document store. Shipping features will be quick. Keeping money and counts exactly right will be… your job now, not the database’s.', note: 'Quick now; you will hand-build the safety later.' },
          { label: 'A shared spreadsheet', desc: 'Maya already has one. It’s free. It has colours.', tags: ['Free', 'It’s a spreadsheet'],
            fx: (s) => { s.flags.sheet = true; }, verdict: 'bad', learn: ['sqlnosql'],
            out: 'It works for eleven days. Then two people edit row 214 at once and somebody’s order becomes a pie chart. You migrate to a real database over a miserable weekend. (Your database runs at half strength until you upgrade it.)', note: 'Every startup tries this once.' }
        ] } },
      { say: [['maya', 'Site’s live! I told my entire contacts list. And my mum. And her contacts list.'], ['quack', 'Watch the top bar. Health is the one that matters. The Build panel on the right is yours — you can buy things any time, not just when I tell you to.']] }
    ] },

    { id: 'monitor', ch: 0, users: 90, title: 'Flying blind', dodge: { if: (s) => s.arch.monitoring, learn: ['observability'],
        say: 'Zoe forwards a complaint about a slow page. You open your dashboard, spot the query in ten seconds, and reply before she finishes her coffee.' }, steps: [
      { say: [['zoe', 'Hi! I’m Zoe, I answer the support inbox. Three people say the site “felt weird” last night. Was it down?'], ['quack', 'Was it? You genuinely don’t know. Notice the map shows no load numbers. You’re driving at night with the dashboard taped over.']] },
      { choose: { who: 'zoe', prompt: 'How will you know when something is wrong?', hint: 'What would let you see a problem BEFORE a customer does?',
        options: [
          { label: 'Dashboards and alerts', desc: 'Track latency, traffic, errors and load on every component. Page me when they go red.', tags: ['$150', '$4/day'], cost: 150,
            fx: (s) => { pay(s, 150); s.arch.monitoring = true; }, verdict: 'great', learn: ['observability'],
            out: 'Graphs light up. Load bars appear on every building on your map. For the first time you can SEE the system breathe.', note: 'See problems before customers do.' },
          { label: 'Customers will tell us', desc: 'Zoe’s inbox is basically a monitoring system. Free!', tags: ['Free', 'Blind'],
            fx: (s) => { rep(s, -4); }, verdict: 'bad', learn: ['observability'],
            out: 'Your alerting system is now angry strangers. It is slow, it has no graphs, and it leaves one-star reviews. (You can still buy Monitoring in the Build panel.)', note: 'Your alerts are now one-star reviews.' },
          { label: 'I’ll check the server by hand each morning', desc: 'Log in, look around, log out.', tags: ['Free', 'You sleep sometimes'],
            fx: (s) => { rep(s, -2); }, verdict: 'ok', learn: ['observability'],
            out: 'It works at 9 AM. Outages, sadly, prefer 3 AM. (Monitoring is in the Build panel when you’re ready.)', note: 'Outages do not keep office hours.' }
        ] } }
    ] },

    { id: 'spike', ch: 0, users: 220, title: 'Fifteen minutes of fame', dodge: { if: (s) => (s.arch.lb && s.arch.count > 1) || s.arch.size > 0, learn: ['vertical', 'horizontal', 'lb'],
        say: ['A famous unboxing channel features {co}. Traffic triples in a minute… and your beefed-up setup shrugs it off. Maya is confused about why you’re not panicking.', 'A radio host raves about {co} on air. Traffic triples in a minute… and your beefed-up setup shrugs it off. Maya is confused about why you’re not panicking.'] }, steps: [
      { say: [['maya', ['WE’RE ON THE FRONT PAGE. A huge unboxing channel just linked us!!', 'THE BIGGEST RADIO SHOW IN THE CITY JUST SAID OUR NAME ON AIR!!']], ['pager', 'CPU 100% — app-server-1. Requests timing out.']] },
      { choose: { who: 'pager', urgent: 45, timeout: 2, prompt: 'Your one server is drowning. What do you do?', before: (s) => { s.spike = { mult: 3, days: 8 }; },
        gun: 0, symptoms: ['app-server-1  CPU 100%  MEM 91%', 'request queue: 2,400 waiting', 'database: bored, mostly idle', 'p95 latency: 9,800 ms'],
        hint: 'The database is fine. The APP server is the problem. A bigger one is quick; more of them is sturdier.',
        options: [
          { label: 'Swap in a bigger machine', desc: 'More CPU, more memory, same single box. Fast to do. Brief restart.', tags: ['$300', 'Quick', 'Still one box'], cost: 300,
            fx: (s) => { pay(s, 300); s.arch.size = Math.max(s.arch.size, 1); rep(s, -2); }, verdict: 'ok', learn: ['vertical', 'spof'],
            out: 'Ninety seconds of downtime while it resizes, then the bigger box swallows the crowd. It’s still ONE box, though. Quack is staring at it.', note: 'Fast fix, but one box is still one box.' },
          { label: 'Add a second server and something to split traffic', desc: 'Two modest machines behind a traffic director. If one dies, the other carries on.', tags: ['$350', 'Sturdier', 'More parts'], cost: 350,
            fx: (s) => { pay(s, 350); s.arch.lb = true; s.arch.count = Math.max(s.arch.count, 2); }, verdict: 'great', learn: ['horizontal', 'lb', 'spof'],
            out: 'A load balancer goes up, a second server joins, traffic splits. Nobody even sees a blip. And you can keep adding servers now.', note: 'Scale out, and no single point of failure.' },
          { label: 'Restart it and hope', desc: 'Turn it off. Turn it on. The classic.', tags: ['Free', 'Hope is not a strategy'],
            fx: (s) => { rep(s, -12); grow(s, 0.85); }, verdict: 'bad', learn: ['vertical', 'horizontal'],
            out: 'It comes back, meets the same crowd, and falls over again. Four times. Your big moment becomes a screenshot of an error page with 12,000 likes.', note: 'The crowd is still there after the reboot.' }
        ] } }
    ] },

    { id: 'slowquery', ch: 0, users: 500, title: 'The four-second page', dodge: { if: (s) => s.arch.index, learn: ['indexing'],
        say: 'Zoe mentions that a competitor’s search takes four seconds. Yours takes forty milliseconds, because you added an index weeks ago. You say nothing and enjoy your tea.' }, steps: [
      { say: [['zoe', ['People keep saying the “My Orders” page takes forever. One guy says he made a sandwich while it loaded.', 'People keep saying the “My Trips” page takes forever. One guy says he walked home while it loaded.']], ['quack', 'Hmm. Traffic’s normal. Something specific is slow. Let’s look at the evidence.']] },
      { choose: { who: 'quack', prompt: 'One page is slow. Everything else is fine. Why — and what’s the fix?',
        gun: 1, symptoms: [['SELECT * FROM orders WHERE user_id = 8812', 'SELECT * FROM trips WHERE rider_id = 8812'], '→ rows examined: 2,104,337', '→ rows returned: 6', '→ time: 4,120 ms'],
        hint: 'It read two million rows to find six. What if the database had a sorted lookup for that column?',
        options: [
          { label: 'Give the database a sorted lookup on that column', desc: 'So it can jump straight to the 6 rows instead of reading 2 million. Writes get a hair slower.', tags: ['$100', 'One-time'], cost: 100,
            fx: (s) => { pay(s, 100); s.arch.index = true; rep(s, 3); }, verdict: 'great', learn: ['indexing'],
            out: '4,120 ms → 3 ms. One line of setup. You stare at the graph for a full minute. This is the best cost-to-benefit ratio you will ever see in your career.', note: 'A 1000x win for a hundred bucks.' },
          { label: 'Buy a bigger database machine', desc: 'More horsepower to read 2 million rows faster.', tags: ['$400', 'Brute force'], cost: 400,
            fx: (s) => { pay(s, 400); s.arch.dbSize = Math.max(s.arch.dbSize, 1); }, verdict: 'ok', learn: ['indexing'],
            out: 'It now reads 2 million rows in 1.5 seconds instead of 4. Next month it’ll be 4 million rows. You bought time, not a fix.', note: 'Faster at doing the wrong thing.' },
          { label: 'Only show the last 3 items', desc: 'Less to show means faster, right?', tags: ['Free', 'Wrong layer'],
            fx: (s) => { rep(s, -4); }, verdict: 'bad', learn: ['indexing'],
            out: 'It still reads all 2 million rows to FIND the last three. Same four seconds, fewer results. Zoe’s inbox gets worse.', note: 'Still scans everything to find those three.' }
        ] } }
    ] },

    { id: 'spof', ch: 0, users: 1100, title: '3:07 AM', steps: [
      { if: (s) => !s.arch.lb, say: [['pager', 'app-server-1 is not responding. app-server-1 is not responding. app-server-1 is n—'], ['quack', 'Disk died. One server means one thing to break. Good morning.']] },
      { if: (s) => !s.arch.lb, choose: { who: 'pager', urgent: 40, timeout: 1, prompt: 'Your only server is dead. The site is fully down.',
        symptoms: ['app-server-1: UNREACHABLE', 'healthy servers: 0 / 1', 'site status: DOWN'],
        hint: 'If there were two servers and something routing around the dead one, users would not have noticed.',
        options: [
          { label: 'Rebuild as two servers behind a traffic director', desc: 'Takes an hour tonight. Never again will one dead box mean a dead site.', tags: ['$350', 'Fixes the root cause'], cost: 350,
            fx: (s) => { pay(s, 350); s.arch.lb = true; s.arch.count = Math.max(2, s.arch.count); rep(s, -4); }, verdict: 'great', learn: ['spof', 'lb', 'horizontal'],
            out: 'An hour of darkness, then you come back with two servers and a load balancer. Next time a disk dies, you’ll read about it over breakfast.', note: 'Remove the single point of failure.' },
          { label: 'Restore the same single server', desc: 'Get back up fast. Deal with it later.', tags: ['$50', 'It will happen again'], cost: 50,
            fx: (s) => { pay(s, 50); rep(s, -8); }, verdict: 'ok', learn: ['spof'],
            out: 'Back up in 40 minutes. Same single box, same risk. “Later” is now a line on your to-do list between “sleep” and “vacation”.', note: 'Same risk, same 3 AM, next month.' }
        ] } },
      { if: (s) => s.arch.lb && !s.flags.stateless, say: [['zoe', ['Weird one. People add things to their cart, click around, and the cart is empty. Then it’s back. Then it’s gone.', 'Weird one. People log in, tap around, and get logged out. Then they’re back in. Then out.']], ['quack', 'Ooh. This started when you added the second server, didn’t it.']] },
      { if: (s) => s.arch.lb && !s.flags.stateless, choose: { who: 'quack', prompt: ['Carts appear and vanish at random since you added server #2. Why?', 'Logins appear and vanish at random since you added server #2. Why?'],
        gun: 1, symptoms: ['request 1 → server-A: session found ✓', 'request 2 → server-B: session not found ✗', 'request 3 → server-A: session found ✓'],
        hint: 'Each server keeps sessions in its own memory. What if neither of them had to remember anything?',
        options: [
          { label: 'Move sessions out of the servers into a shared store', desc: 'Servers remember nothing; any server can handle any request.', tags: ['$100', 'Clean'], cost: 100,
            fx: (s) => { pay(s, 100); s.flags.stateless = true; rep(s, 3); }, verdict: 'great', learn: ['stateless'],
            out: 'Servers become interchangeable. You can add ten more or lose three and no user will ever know. This one quiet change is what makes scaling out possible.', note: 'Any server can now answer anyone.' },
          { label: 'Glue each user to “their” server', desc: 'The traffic director always sends the same user to the same box.', tags: ['Free', 'Fragile'],
            fx: (s) => { s.flags.sticky = true; }, verdict: 'ok', learn: ['stateless'],
            out: 'Sticky sessions. It works… until that server dies and takes its users’ sessions with it, or one unlucky box gets all the heavy users.', note: 'Works until that one server dies.' },
          { label: 'Go back to one server', desc: 'No second server, no confusion.', tags: ['Free', 'Backwards'],
            fx: (s) => { s.arch.count = 1; s.arch.lb = false; rep(s, -3); }, verdict: 'bad', learn: ['stateless', 'spof'],
            out: 'The bug is gone. So is your redundancy and half your capacity. Quack turns to face the wall.', note: 'Trades a bug for a single point of failure.' }
        ] } }
    ] },

    // ───────────────────────── CHAPTER 2 ─────────────────────────
    { id: 'funding', ch: 1, users: 2000, title: 'The term sheet', steps: [
      { say: [
        ['viktor', 'Viktor. Northwind Capital. I’ve read your numbers. Two thousand users, no marketing. Interesting.'],
        ['viktor', 'I am wiring $15,000. In return I want growth. A chart that goes up and to the right. I do not want to hear the word “outage”.'],
        ['maya', 'WE’RE FUNDED! I already booked billboards. And a podcast ad. And a blimp. Is your thing ready for a LOT more people?'],
        ['quack', 'New toys just unlocked in the Build panel. You may want to look before the blimp launches.']
      ], after: (s) => { s.cash += 15000; s.boost = { mult: 1.5, days: 30 }; } }
    ] },

    { id: 'reads', ch: 1, users: 3500, title: 'Everybody’s browsing', dodge: { if: (s) => s.arch.cache || s.arch.replicas > 0, learn: ['caching', 'replication'],
        say: 'The blimp works. Thousands of people show up to browse. Your database barely notices — most of those reads never reach it. Viktor sends a thumbs-up emoji. It’s unsettling.' }, steps: [
      { say: [['pager', 'database-1 CPU 97%. Read queries queueing.'], ['quack', ['Look at the mix: for every person who buys, ninety are just scrolling. Same products. Same pages. Over and over.', 'Look at the mix: for every ride booked, ninety requests are people checking prices and nearby cars. Same answers. Over and over.']]] },
      { choose: { who: 'quack', urgent: 50, timeout: 2, prompt: 'The database is melting, and almost all of it is repeated read queries.',
        gun: 1, symptoms: ['queries/sec: 91% SELECT, 9% writes', ['top query: product page #4471 (asked 18,000×/min)', 'top query: fare estimate downtown→airport (asked 18,000×/min)'], 'database-1 CPU 97%', 'app servers: fine'],
        hint: 'The same question is asked 18,000 times a minute. Does the database really need to answer it each time?',
        options: [
          { label: 'Keep popular answers in fast memory', desc: 'A small in-memory store in front of the database. Repeated questions never reach the DB. Answers may be slightly old.', tags: ['$400', 'Huge win', 'Can go stale'], cost: 400,
            fx: (s) => { pay(s, 400); s.arch.cache = true; }, verdict: 'great', learn: ['caching'],
            out: 'Database load drops by three quarters in an instant. The popular stuff is served from memory in under a millisecond. Quack does a little spin.', note: 'Answer once, serve a thousand times.' },
          { label: 'Add copies of the database for reading', desc: 'The main DB takes writes; copies answer read queries. Copies lag a moment behind.', tags: ['$300', 'Solid', 'Slight lag'], cost: 300,
            fx: (s) => { pay(s, 300); s.arch.replicas = Math.max(1, s.arch.replicas); }, verdict: 'great', learn: ['replication'],
            out: 'A read replica comes online and takes half the questions. Bonus: if the primary ever dies, you have a warm copy. You can add more replicas in Build.', note: 'More hands to answer reads, plus a spare.' },
          { label: 'Buy the biggest database machine', desc: 'Throw hardware at it.', tags: ['$1,500', 'Has a ceiling'], cost: 1500,
            fx: (s) => { pay(s, 1500); s.arch.dbSize = 2; }, verdict: 'ok', learn: ['caching', 'replication'],
            out: 'That works — today. You are now on the largest machine money can rent, answering the same question 18,000 times a minute, very expensively.', note: 'There is no bigger machine after this one.' }
        ] } }
    ] },

    { id: 'stale', ch: 1, users: 6000, title: 'The price was right (yesterday)', cond: (s) => s.arch.cache, steps: [
      { say: [['zoe', ['A customer bought a blender for ₹1,999. The price changed to ₹2,499 three hours ago. The page still showed the old one. He has screenshots. He has a LOT of screenshots.', 'A rider was quoted ₹180. Surge started ten minutes earlier; the real fare was ₹310. She has screenshots. She has a LOT of screenshots.']], ['quack', 'Your cache is doing exactly what you told it to: remembering. Nobody told it when to forget.']] },
      { choose: { who: 'quack', prompt: 'The cache is serving old data. When should a cached answer be thrown away?', hint: 'Not everything ages at the same speed. Photos last forever; prices do not.',
        options: [
          { label: 'Expiry dates, tuned per kind of data — and wipe on change', desc: 'Prices: short expiry and cleared the moment they change. Photos and descriptions: long expiry.', tags: ['Balanced', 'A bit more work'],
            fx: (s) => { s.flags.ttl = true; rep(s, 4); }, verdict: 'great', learn: ['invalidation'],
            out: 'Prices refresh the instant they change; everything else stays cached for hours. Fresh where it matters, fast everywhere else.', note: 'Fresh where it matters, cached where it doesn’t.' },
          { label: 'Expire everything after 5 seconds', desc: 'Nothing can be more than 5 seconds stale.', tags: ['Simple', 'Cache barely helps'],
            fx: (s) => { s.flags.ttl = true; s.flags.weakCache = true; }, verdict: 'ok', learn: ['invalidation'],
            out: 'Staleness solved. But the cache now empties itself constantly and the database is sweating again. (Your cache is less effective.)', note: 'Safe, but throws away most of the benefit.' },
          { label: 'Rip the cache out', desc: 'No cache, no stale data.', tags: ['Free', 'Database says no'],
            fx: (s) => { s.arch.cache = false; rep(s, -3); }, verdict: 'bad', learn: ['invalidation'],
            out: 'Technically correct. Every single request hits the database again. You hear its fans from across the room.', note: 'Cures the headache by removing the head.' }
        ] } },
      { if: (s) => s.arch.cache, tune: { who: 'quack', prompt: ['Try it yourself. How long should a cached PRICE live before it expires?', 'Try it yourself. How long should a cached FARE ESTIMATE live before it expires?'],
        values: [1, 5, 15, 30, 60, 120, 300, 900, 3600, 86400], start: 8, sweet: [60, 300], fmt: (v) => (v < 60 ? v + ' seconds' : v < 3600 ? v / 60 + ' minutes' : v / 3600 + ' hours'), lo: 'Always fresh', hi: 'Rarely refreshed',
        meters: [{ name: 'Customers seeing an old price', fn: (v) => Math.log(v) / Math.log(86400) - 0.25 }, { name: 'Load on the database', fn: (v) => 1 - Math.log(v + 1) / Math.log(300) }],
        low: 'Fresh, yes. But the cache empties so fast the database does nearly all the work again.', mid: 'Nobody sees a price more than a few minutes old, and the database still gets most of the day off.', high: 'The database is relaxing on a beach. Your customers are paying yesterday’s prices.' } }
    ] },

    { id: 'cdn', ch: 1, users: 10000, title: 'Loading… loading…', dodge: { if: (s) => s.arch.cdn, learn: ['cdn'],
        say: ['Maya’s launch in three new countries goes live. Product photos load instantly everywhere, served from edge servers a few kilometres from each shopper.', 'Maya launches in three new cities abroad. The app’s maps and images load instantly, served from edge servers a few kilometres from each rider.'] }, steps: [
      { say: [['maya', ['I’m at a conference in Singapore showing {co} to a retail giant and the product photos are loading line… by… line. Like it’s 1998.', 'I’m in Singapore demoing {co} to the transport ministry and the map is loading tile… by… tile. Like it’s 1998.']], ['quack', 'Your servers are 6,000 km from her. And they’re spending a third of their effort handing out the same pictures to everyone.']] },
      { choose: { who: 'maya', prompt: 'Images and static files are slow far away, and they’re hogging your servers.', hint: 'The files never change. Why does every copy travel from your one location?',
        options: [
          { label: 'Park copies of the files near users, worldwide', desc: 'Files live in cheap bulk storage; a global network of edge servers hands them out locally.', tags: ['$250', 'Offloads ~35% of traffic'], cost: 250,
            fx: (s) => { pay(s, 250); s.arch.cdn = true; rep(s, 4); }, verdict: 'great', learn: ['cdn'],
            out: 'Photos now come from a server down the street from each user. Your app servers stop serving JPEGs and get a third of their life back.', note: 'Faster for users AND lighter on servers.' },
          { label: 'More app servers', desc: 'More machines to serve more pictures.', tags: ['$300', 'Still far away'], cost: 300,
            fx: (s) => { pay(s, 300); if (s.arch.lb) s.arch.count += 2; else s.arch.size = Math.min(2, s.arch.size + 1); }, verdict: 'ok', learn: ['cdn'],
            out: 'There’s more capacity now, but Singapore is still 6,000 km away. Physics remains undefeated.', note: 'Capacity isn’t distance.' },
          { label: 'Make all images tiny', desc: 'Shrink everything to thumbnails.', tags: ['Free', 'Ugly'],
            fx: (s) => { rep(s, -5); s.conv *= 0.95; }, verdict: 'bad', learn: ['cdn'],
            out: ['It’s faster! Also every product now looks like it was photographed through a keyhole. Sales dip.', 'It’s faster! Also the map now looks like a potato drew it. Bookings dip.'], note: 'Faster, and now nobody wants to look at it.' }
        ] } }
    ] },

    { id: 'hack1', ch: 1, users: 16000, title: 'HACK ALERT', dodge: { if: (s) => s.arch.ratelimit, learn: ['ratelimit'],
        say: 'Someone fires 40,000 login attempts a minute at {co} from a handful of machines. Your rate limiter lets through ten each and returns “429 Too Many Requests” to the rest. Somewhere, a stranger called nullbyte frowns.' }, steps: [
      { say: [['pager', 'Login failures up 9,000%. 40,000 attempts/minute.'], ['nb', 'hello {co}. cute little site. i have 2 million leaked passwords from other places and people LOVE reusing them. knock knock.']] },
      { choose: { who: 'pager', urgent: 45, timeout: 2, prompt: 'A bot is trying stolen passwords against your login, 40,000 times a minute.',
        gun: 1, symptoms: ['POST /login  40,112 req/min', 'distinct source IPs: 14 (rotating)', 'successful logins from attack: 37 and counting', 'real users: can’t log in, servers saturated'],
        hint: 'No human logs in 3,000 times a minute. What if each client only got a few tries?',
        options: [
          { label: 'Cap how many requests each client may make', desc: 'A handful of login tries per minute per client. Humans never notice; bots hit a wall.', tags: ['$150', 'Stops the flood'], cost: 150,
            fx: (s) => { pay(s, 150); s.arch.ratelimit = true; rep(s, 2); }, verdict: 'great', learn: ['ratelimit'],
            out: 'The flood becomes a drip. 37 accounts were breached before the wall went up — you reset them and email the owners. nullbyte goes quiet. For now.', note: 'Humans never notice; bots hit a wall.' },
          { label: 'Block the 14 attacking addresses by hand', desc: 'Find them in the logs. Ban them.', tags: ['Free', 'Whack-a-mole'],
            fx: (s) => { rep(s, -6); grow(s, 0.97); }, verdict: 'ok', learn: ['ratelimit'],
            out: 'You ban 14 addresses. Fourteen new ones appear. You ban those. It’s 5 AM, you’ve banned 300, and 400 accounts are compromised. (A real limiter is in Build.)', note: 'They have more addresses than you have patience.' },
          { label: 'Take login offline until it stops', desc: 'Nobody can attack what isn’t there.', tags: ['Free', 'Nobody can log in'],
            fx: (s) => { rep(s, -12); grow(s, 0.93); }, verdict: 'bad', learn: ['ratelimit'],
            out: 'The attack stops. So does your business. nullbyte didn’t have to take you down — you did it for them.', note: 'You finished the attacker’s job for them.' }
        ] } },
      { if: (s) => s.arch.ratelimit, tune: { who: 'quack', prompt: 'The limiter is up. Now tune it: how many login attempts may one client make per minute?',
        values: [1, 2, 3, 5, 8, 10, 15, 20, 40, 80, 200, 1000], start: 10, sweet: [5, 20], fmt: (v) => v + ' / minute', lo: 'Strict', hi: 'Loose',
        meters: [{ name: 'Real users locked out', fn: (v) => (v < 5 ? 1 - v / 6 : 0.05) }, { name: 'Stolen passwords the bot can test', fn: (v) => Math.pow(Math.log(v) / Math.log(1000), 2) }],
        low: 'People mistype passwords. At this setting, your own customers get locked out constantly.', mid: 'Humans get a few honest mistakes. A bot with two million passwords would need years.', high: 'A human never needs this many tries. A bot is delighted.' } },
      { say: [['nb', 'huh. not bad. see you around, garage kid.']] }
    ] },

    { id: 'bloom', ch: 1, users: 24000, title: 'Too many usernames', steps: [
      { say: [['maya', 'Sign-ups are EXPLODING. The blimp is working! But the sign-up page freezes while people type their username…'], ['quack', 'Every keystroke asks the database “is this name taken?” And here’s the fun part: almost every answer is NO. New names aren’t in the cache, because they don’t exist. Every one of them falls through to the database.']] },
      { choose: { who: 'quack', prompt: '“Is this username taken?” is hammering the database — and 96% of the time the answer is simply “no”.',
        gun: 2, symptoms: ['GET /username-available  52,000 req/min', 'cache hit rate for this endpoint: 4%', '96% of lookups: name does not exist', 'database-1: doing 50,000 pointless searches a minute'],
        hint: 'You need something tiny that can instantly say “definitely not taken” — it’s fine if it sometimes says “maybe, go check”.',
        options: [
          { label: 'A tiny bit-map that can say “definitely not taken” or “maybe taken”', desc: 'Hash each existing name into a small array of bits. “No” answers are instant and always right. “Maybe” falls through to the DB.', tags: ['$80', 'Few MB of memory', 'Occasional “maybe”'], cost: 80,
            fx: (s) => { pay(s, 80); s.flags.bloom = true; rep(s, 4); }, verdict: 'great', learn: ['bloom'],
            out: 'A few megabytes of bits now answer 96% of the checks without touching the database. You just reinvented something from 1970 — it’s called a Bloom filter, and you figured it out from first principles.', note: 'Megabytes of memory, 96% of lookups gone.' },
          { label: 'Load every username into memory', desc: 'Keep the full list of all names in the in-memory store.', tags: ['$600', 'Works', 'Memory-hungry'], cost: 600,
            fx: (s) => { pay(s, 600); s.flags.bloom = true; s.flags.fatNames = true; }, verdict: 'ok', learn: ['bloom'],
            out: 'It works. It also eats gigabytes of memory that grows with every sign-up, to answer a yes/no question. There was a much smaller trick.', note: 'Right idea, 500x the memory.' },
          { label: 'Only check when they press “Sign up”', desc: 'Drop the live check.', tags: ['Free', 'Worse sign-up flow'],
            fx: (s) => { s.conv *= 0.96; rep(s, -2); }, verdict: 'ok', learn: ['bloom'],
            out: 'Load drops. So do sign-ups: people fill the whole form, hit submit, get “name taken”, sigh, and leave.', note: 'Fixes load by making sign-up worse.' }
        ] } }
    ] },

    { id: 'friday', ch: 1, users: 36000, title: 'Friday, 6:02 PM', dodge: { if: (s) => s.arch.cicd, learn: ['cicd', 'rollback'],
        say: 'You push a small change on Friday evening. The pipeline runs 400 tests, catches a typo that would have broken checkout, and refuses to deploy it. You fix it Monday. You have a weekend. An actual weekend.' }, steps: [
      { say: [['maya', 'Tiny thing before the weekend! Can you change the button colour? Investors are looking at the site tomorrow.'], ['quack', 'You deploy by logging into the server and copying files by hand. On a Friday. I’m just a duck, but.'], ['pager', ['CHECKOUT ERROR RATE 100%. Orders: 0/min.', 'BOOKING ERROR RATE 100%. Rides: 0/min.']]] },
      { choose: { who: 'pager', urgent: 40, timeout: 1, prompt: 'Your hand-copied deploy had a typo. The most important button on the site is broken.',
        gun: 1, symptoms: ['deploy: manual copy, 6:01 PM', 'tests run before deploy: 0', 'previous version: overwritten', 'config.js line 44: unexpected “,,”'],
        hint: 'Fastest way out is usually backwards. Do you still HAVE the old version?',
        options: [
          { label: 'Find the typo and patch it live', desc: 'It’s one character. Fix forward, right now, in production.', tags: ['Risky', 'Could be fast'],
            fx: (s) => { rep(s, -6); grow(s, 0.97); }, verdict: 'ok', learn: ['rollback'],
            out: 'You find it in 25 minutes with shaking hands. It works. Editing production live with your heart rate at 160 is not a process.', note: 'Worked this time. Hands were shaking.' },
          { label: 'Rebuild the old version from memory and backups', desc: 'You overwrote it, so… dig through backups.', tags: ['Slow', 'Safe-ish'],
            fx: (s) => { rep(s, -9); grow(s, 0.95); }, verdict: 'bad', learn: ['rollback'],
            out: 'Two hours. You had no “undo”, so you had to rebuild the past by hand. Maya’s investor demo featured an error page.', note: 'No undo button means archaeology.' }
        ] } },
      { choose: { who: 'quack', prompt: 'How should code get to production from now on?', hint: 'What if a machine did the exact same checked steps every single time?',
        options: [
          { label: 'An automated line: test every change, ship gradually, keep the old version one click away', desc: 'Machines run the tests and do the deploy the same way every time. Instant rollback.', tags: ['$300', '$5/day', 'Sleep returns'], cost: 300,
            fx: (s) => { pay(s, 300); s.arch.cicd = true; rep(s, 3); }, verdict: 'great', learn: ['cicd', 'rollback'],
            out: 'A pipeline goes up. Every change gets tested by robots, rolled out carefully, and can be undone in seconds. Deploys become so boring you do ten a day.', note: 'Boring deploys are the goal.' },
          { label: 'A checklist taped to the monitor', desc: '“1. Back up. 2. Copy files. 3. Don’t typo.”', tags: ['Free', 'Human-powered'],
            fx: (s) => { s.flags.checklist = true; }, verdict: 'ok', learn: ['cicd'],
            out: 'Better than nothing. Humans skip step 1 when they’re in a hurry, and they’re always in a hurry.', note: 'Works until someone is in a hurry.' },
          { label: 'Just never deploy on Fridays', desc: 'Ban Fridays.', tags: ['Free', 'Tuesdays exist'],
            fx: () => {}, verdict: 'bad', learn: ['cicd'],
            out: 'The typo does not know what day it is. It will be just as happy to ruin a Tuesday.', note: 'The bug doesn’t own a calendar.' }
        ] } }
    ] },

    // ───────────────────────── CHAPTER 3 ─────────────────────────
    { id: 'writes', ch: 2, users: 50000, title: ['The flash sale', 'The stadium empties'], dodge: { if: (s) => s.arch.queue, learn: ['queue', 'pubsub'],
        say: ['Maya’s surprise flash sale hits. Orders pour into your queue and get processed in a calm, steady stream. Customers see “Order received!” in 80 ms. You eat lunch.', 'A sold-out concert ends and 30,000 people request rides at once. Bookings pour into your queue and get matched in a calm, steady stream. You eat dinner.'] }, steps: [
      { say: [['maya', ['Surprise! I announced a ONE-HOUR flash sale. 70% off. It started four minutes ago. You’re welcome!', 'Surprise! We’re the official ride partner of tonight’s stadium concert. It just ended. 30,000 people. You’re welcome!']], ['pager', ['Checkout p95: 28 seconds. Timeouts rising.', 'Booking p95: 28 seconds. Timeouts rising.']]] },
      { choose: { who: 'pager', urgent: 50, timeout: 2, before: (s) => { s.spike = { mult: 2.5, days: 6 }; }, prompt: ['Placing an order takes 28 seconds. Each order does six things before replying to the customer.', 'Booking a ride takes 28 seconds. Each booking does six things before replying to the rider.'],
        gun: 4, symptoms: [['place_order():', 'book_ride():'], '  1. save to database      40 ms', '  2. charge card           900 ms', ['  3. send confirmation email  2,100 ms', '  3. send SMS to rider     2,100 ms'], ['  4. generate invoice PDF  3,400 ms', '  4. generate receipt PDF  3,400 ms'], '  5. update analytics      1,200 ms', '  6. notify partner system   …timeout'],
        hint: 'Does the customer need to WAIT for the email and the PDF? What if you just promised to do them?',
        options: [
          { label: 'Accept instantly, put the slow jobs in a waiting line', desc: 'Save it, reply “got it!”, and let background workers do emails, PDFs and notifications at their own pace.', tags: ['$500', 'Absorbs spikes', 'Work finishes later'], cost: 500,
            fx: (s) => { pay(s, 500); s.arch.queue = true; rep(s, 3); }, verdict: 'great', learn: ['queue', 'pubsub'],
            out: 'Replies drop from 28 seconds to 90 ms. The slow work lines up politely in a queue and drains over the next ten minutes. Nobody is left staring at a spinner.', note: 'Say “got it” now, do the slow part later.' },
          { label: 'Triple the app servers', desc: 'More servers to do the six things in parallel.', tags: ['$900', 'Still slow per order'], cost: 900,
            fx: (s) => { pay(s, 900); if (s.arch.lb) s.arch.count += 4; rep(s, -5); }, verdict: 'ok', learn: ['queue'],
            out: 'More people get served, but each one still waits for an email server and a PDF generator before seeing “thanks”. The slow step is the slow step.', note: 'Each order still waits on the slowest step.' },
          { label: 'Turn off emails and invoices during the rush', desc: 'Skip the slow steps entirely.', tags: ['Free', 'Customers get nothing'],
            fx: (s) => { rep(s, -10); }, verdict: 'bad', learn: ['queue'],
            out: ['Orders go through. Nobody gets a confirmation. 9,000 people email Zoe asking “did my order work??” and then order again to be safe.', 'Rides get booked. Nobody gets a confirmation. 9,000 people message Zoe asking “is my car coming??” and book again to be safe.'], note: 'Fast, and now nobody knows if it worked.' }
        ] } }
    ] },

    { id: 'race', ch: 2, users: 80000, title: ['One console, 37 buyers', 'One driver, two riders'], steps: [
      { say: [['zoe', ['We had ONE limited-edition console in stock. We sold it to thirty-seven people. They are all in my inbox. Together. They’ve formed a group chat.', 'One driver got assigned to two riders on opposite sides of town at the same moment. Both riders are in my inbox. So is the driver. He’s the angriest.']], ['quack', ['Thirty-seven requests all asked “is there 1 left?” in the same millisecond. All thirty-seven heard “yes”.', 'Two requests both asked “is this driver free?” in the same millisecond. Both heard “yes”.']]] },
      { choose: { who: 'quack', prompt: ['Many buyers check stock at the same instant, all see “1 left”, all buy it.', 'Two riders check the same driver at the same instant, both see “free”, both get him.'],
        gun: 3, symptoms: ['T+0 ms  req A: read → available', 'T+0 ms  req B: read → available', 'T+1 ms  req A: write → taken by A', 'T+1 ms  req B: write → taken by B   ← !!'],
        hint: '“Check” and “take” happen as two separate steps. They need to be one un-interruptible step.',
        options: [
          { label: 'Make “check and take” a single all-or-nothing step', desc: 'The first request locks the row, takes it, and commits. Everyone else sees “gone”.', tags: ['Correct', 'Slightly slower'],
            fx: (s) => { s.flags.lock = true; rep(s, 4); if (s.flags.nosql) pay(s, 600); }, verdict: 'great', learn: ['locking', 'acid'],
            out: (s) => 'Check-and-take is now atomic. One winner, thirty-six polite “sorry, just sold out” messages.' + (s.flags.nosql ? ' (Your document store didn’t give you this for free — you paid $600 building it yourself.)' : ' Your strict database from day one made this a two-line change.'), note: 'One winner, everyone else told immediately.' },
          { label: 'Let everyone try; reject whoever finds the record changed', desc: 'Each record carries a version number. If it changed since you read it, your write fails and you retry.', tags: ['Fast when clashes are rare', 'Retries under contention'],
            fx: (s) => { s.flags.lock = true; rep(s, 3); }, verdict: 'great', learn: ['locking'],
            out: 'Optimistic locking: no waiting in line, and the loser of a race is told to refresh. Perfect when collisions are rare, which is most of the time.', note: 'No queueing; losers just retry.' },
          { label: 'Apologise and send discount codes', desc: 'It’s rare. Handle it in support.', tags: ['$2,000 now', 'Forever'], cost: 2000,
            fx: (s) => { pay(s, 2000); rep(s, -6); }, verdict: 'bad', learn: ['locking'],
            out: 'Thirty-six discount codes go out. Next week it happens with concert tickets. The group chat has a name now.', note: 'It’s rare until it’s the popular item.' }
        ] } }
    ] },

    { id: 'idem', ch: 2, users: 130000, title: 'Charged twice', steps: [
      { say: [['viktor', 'My wife used your app last night. She was charged twice. She has informed me. Repeatedly.'], ['quack', 'The payment went through, but the “success” reply got lost on a flaky connection. So the app did the sensible thing and tried again. And the bank did the sensible thing and charged again.']] },
      { choose: { who: 'quack', prompt: 'When a payment reply is lost, the app retries — and the customer pays twice.',
        gun: 2, symptoms: ['21:04:07  charge ₹2,499 → sent', '21:04:10  (no reply: network timeout)', '21:04:10  retry: charge ₹2,499 → sent', '21:04:11  bank: 2 charges approved'],
        hint: 'How could the server recognise “I’ve seen this exact request before”?',
        options: [
          { label: 'Stamp every payment with a unique ticket number', desc: 'If the same ticket arrives twice, return the first result instead of charging again.', tags: ['Correct', 'Retries become safe'],
            fx: (s) => { s.flags.idem = true; rep(s, 4); }, verdict: 'great', learn: ['idempotency', 'retries'],
            out: 'Every payment now carries an idempotency key. Retry it once or fifty times — one charge. Viktor’s wife gets a refund and a fruit basket.', note: 'Retry fifty times, charge once.' },
          { label: 'Never retry payments', desc: 'If the reply is lost, show an error.', tags: ['Free', 'Lost sales'],
            fx: (s) => { s.conv *= 0.94; rep(s, -3); }, verdict: 'ok', learn: ['idempotency'],
            out: 'No more double charges. Now customers who WERE charged see “payment failed” and get no order. Arguably worse.', note: 'Trades double charges for ghost charges.' },
          { label: 'Refund duplicates each morning', desc: 'A daily script finds doubles and refunds them.', tags: ['$1,000', 'Cleanup crew'], cost: 1000,
            fx: (s) => { pay(s, 1000); rep(s, -5); }, verdict: 'bad', learn: ['idempotency'],
            out: 'Refunds take 5–7 business days. Angry posts take 5–7 seconds.', note: 'Refunds are slow; screenshots are fast.' }
        ] } }
    ] },

    { id: 'special', ch: 2, users: 200000, title: ['“shoez”', 'Where is everybody?'], steps: [
      { say: [['maya', ['I searched for “red shoez” on our own site. Zero results. We sell four hundred red shoes!!', 'Riders say the “nearby cars” map takes ten seconds. By then the cars have moved!']], ['quack', ['The search runs LIKE ‘%red shoez%’ against every product description. It reads the entire catalogue per search, and it can’t spell.', 'To find nearby drivers, you’re measuring the distance from the rider to every single driver on Earth. All 90,000. For every request.']]] },
      { choose: { who: 'quack', prompt: ['Search is slow and unforgiving. It scans every product for every query.', 'Finding nearby drivers compares the rider against every driver in the system.'],
        gun: 1, symptoms: [['query: “red shoez”', 'query: drivers within 2 km of (12.97, 77.59)'], ['products scanned: 3,800,000', 'drivers compared: 90,112'], ['matches: 0', 'matches: 7'], 'time: 6,300 ms'],
        hint: ['A book’s back-of-the-book index goes from word → pages. Your search goes from pages → word.', 'To find a friend at a festival you go to their zone; you don’t interview the whole crowd.'],
        options: [
          { label: ['Build a word → products lookup', 'Chop the map into cells; only look in the rider’s cell and its neighbours'], desc: ['A dedicated search system: each word points to the products containing it. Handles typos and ranking.', 'Every driver is filed under the grid cell they’re in. “Nearby” means checking a handful of cells, not the planet.'], tags: ['$700', 'Purpose-built'], cost: 700,
            fx: (s) => { pay(s, 700); s.arch.search = true; s.conv *= 1.06; rep(s, 4); }, verdict: 'great', learn: [(s) => s.scenario === 'ride' ? 'geo' : 'search'],
            out: ['An inverted index. “red shoez” returns 412 results in 30 ms, typo forgiven. Conversion ticks up — people buy what they can find.', 'A geospatial index. “Who’s near me” now checks nine little cells instead of 90,000 drivers. 8 ms. The cars on the map are where the cars actually are.'], note: ['Look up the word, not the whole catalogue.', 'Check nine cells, not ninety thousand drivers.'] },
          { label: ['More database copies to share the search load', 'Add separate sorted lookups on latitude and longitude'], desc: ['More replicas, same slow query on each.', 'Two ordinary indexes, one per coordinate.'], tags: ['$600', 'Wrong tool'], cost: 600,
            fx: (s) => { pay(s, 600); s.arch.replicas = Math.min(5, s.arch.replicas + 1); }, verdict: 'ok', learn: [(s) => s.scenario === 'ride' ? 'geo' : 'search'],
            out: ['Each replica now runs the same terrible scan, in parallel. Still six seconds. Still can’t spell.', 'Better than nothing: it finds everyone in the right latitude band… all the way around the globe, then filters. Two dimensions need a two-dimensional index.'], note: ['Same slow scan, more machines.', 'A line around the globe is not “nearby”.'] },
          { label: ['Limit search to product titles only', 'Only show drivers in the same city'], desc: ['Less text to scan.', 'A smaller haystack.'], tags: ['Free', 'Band-aid'],
            fx: (s) => { rep(s, -3); }, verdict: 'ok', learn: [(s) => s.scenario === 'ride' ? 'geo' : 'search'],
            out: ['Faster, and now it misses anything described but not titled. “Waterproof” returns nothing. You sell raincoats.', 'A smaller haystack is still a haystack. Mumbai alone has 30,000 drivers.'], note: ['Smaller haystack, still a haystack.', 'Smaller haystack, still a haystack.'] }
        ] } }
    ] },

    { id: 'live', ch: 2, users: 260000, title: 'Are we there yet?', steps: [
      { say: [['quack', ['Fun fact: 40% of your traffic right now is the “Track my order” page asking “any update?” every single second. The answer is “no” 99.9% of the time.', 'Fun fact: 40% of your traffic right now is rider apps asking “where’s my driver?” every single second, each one a brand-new request.']]] },
      { choose: { who: 'quack', prompt: ['Order tracking asks the server for news every second, for every open tab.', 'Every rider’s app asks for the driver’s position every second.'], hint: 'What if the server could just… tell them when something changes?',
        options: [
          { label: 'Keep one connection open and push updates down it', desc: 'The server speaks only when there’s news. More connections to hold; far fewer requests.', tags: ['Real-time', 'Stateful connections'],
            fx: (s) => { s.flags.ws = true; rep(s, 3); }, verdict: 'great', learn: ['websockets'],
            out: ['WebSockets. Tracking traffic drops 95%, and updates arrive the instant the courier scans the parcel.', 'WebSockets. The car glides smoothly across the map, and your request volume drops by more than a third.'], note: 'The server calls you; you stop calling it.' },
          { label: 'Ask less often — every 30 seconds', desc: 'Same idea, fewer calls.', tags: ['Free', 'Laggy'],
            fx: (s) => { s.flags.ws = true; s.flags.slowPoll = true; rep(s, -1); }, verdict: 'ok', learn: ['websockets'],
            out: ['Load drops nicely. The tracking page is now up to 30 seconds behind reality, which is fine for parcels.', 'Load drops nicely. The car now teleports across the map in 30-second jumps. Riders find it “spooky”.'], note: 'Cheap and fine when “live” can be lazy.' },
          { label: 'Leave it — buy more servers', desc: 'It works. It just costs.', tags: ['$1,200', 'Pays the “are we there yet” tax'], cost: 1200,
            fx: (s) => { pay(s, 1200); if (s.arch.lb) s.arch.count += 3; }, verdict: 'bad', learn: ['websockets'],
            out: 'You are now renting servers whose full-time job is to say “no, nothing yet”.', note: 'Paying rent to say “nothing new”.' }
        ] }, after: (s) => { if (!s.flags.ws) s.flags.pollTax = true; } }
    ] },

    { id: 'feature', ch: 2, users: 330000, title: 'A feature request', steps: [
      { say: [['maya', ['Idea! A “You might also like” row. Personalised product recommendations. Every big store has it. Viktor LOVES it. Can we add it?', 'Idea! “Smart suggestions” — the app guesses where you’re going and offers shared rides. Every big app has it. Viktor LOVES it. Can we add it?']]] },
      { choose: { who: 'maya', prompt: 'Add the recommendation feature?', hint: 'New features bring growth and risk. The interesting part is HOW you ship it.',
        options: [
          { label: 'Yes — let’s build it', desc: 'Could lift sales. New code in the hot path is new risk.', tags: ['Growth', 'Risk'],
            fx: (s) => { s.flags.reco = true; }, verdict: 'ok', learn: [], out: 'The team (you, a contractor, and Quack) builds it in two weeks. Now the real question: how do you release it?', note: 'Growth, if you ship it carefully.' },
          { label: 'Not now — stability first', desc: 'Skip it. Keep the system calm.', tags: ['Safe', 'Viktor sulks'],
            fx: (s) => { rep(s, 1); s.boost = { mult: 0.9, days: 15 }; }, verdict: 'ok', learn: [], out: 'Saying no is a design decision too. Viktor sends a one-word email: “Noted.” Growth is a little slower this month.', note: 'Saying no is also architecture.' }
        ] } },
      { if: (s) => s.flags.reco, choose: { who: 'viktor', prompt: 'Maya is SURE users will love it. Viktor wants it live for everyone today. How do you find out if it actually helps?', hint: 'Opinions are free. What would evidence look like?',
        options: [
          { label: 'Show it to 10% of users and compare against the rest', desc: 'Two groups, one difference, real numbers after a week.', tags: ['Evidence', 'Takes a week'],
            fx: (s) => { s.flags.ab = true; s.conv *= 1.08; }, verdict: 'great', learn: ['abtest'],
            out: 'The A/B test surprises everyone: the big flashy carousel Maya loved LOWERS sales by 3%. A quieter version raises them 8%. You ship the quiet one. Nobody argues with the graph.', note: 'The graph settled the argument.' },
          { label: 'Ship it to everyone — it’s obviously good', desc: 'Trust the founders’ gut.', tags: ['Fast', 'Blind'],
            fx: (s) => { s.conv *= 0.97; }, verdict: 'bad', learn: ['abtest'],
            out: 'Sales dip 3% the following week. Is it the feature? The weather? A competitor? Nobody knows, because there’s nothing to compare against.', note: 'No comparison group, no idea what happened.' },
          { label: 'Survey users about whether they’d like it', desc: 'Ask them.', tags: ['Cheap', 'People are polite'],
            fx: (s) => { s.conv *= 1.01; }, verdict: 'ok', learn: ['abtest'],
            out: '91% say they’d love it. People also say they’d love to go to the gym. What users say and what users do are different datasets.', note: 'What people say ≠ what people do.' }
        ] } },
      { if: (s) => s.flags.reco, choose: { who: 'quack', prompt: 'The new version is ready. It touches every page. How do you roll it out?', hint: 'Assume the new version has a bug you haven’t found. Which plan hurts least?',
        options: [
          { label: 'Run old and new side by side, then flip all traffic at once', desc: 'A full second copy of production. Switch over in one move; switch back in one move.', tags: ['2× servers briefly', 'Instant undo'],
            fx: (s) => { s.flags.safeDeploy = 'bluegreen'; pay(s, 400); rep(s, 3); }, verdict: 'great', learn: ['bluegreen'],
            out: 'Blue/green. A complete second copy of production is warmed up and waiting. Your hand is on the switch — and on the switch back. Watch the error graph.', note: 'Instant switch, instant switch-back.' },
          { label: 'Send 1% of traffic to the new version and watch', desc: 'Grow to 10%, 50%, 100% only if the graphs stay calm.', tags: ['Tiny blast radius', 'Slower'],
            fx: (s) => { s.flags.safeDeploy = 'canary'; rep(s, 3); }, verdict: 'great', learn: ['canary'],
            out: 'A canary release. You’ll feed the new version a trickle of real traffic and turn the dial up only while the graph stays calm. Your hand is on the dial.', note: 'A bug only 1% of users ever met.' },
          { label: 'Replace everything in place at noon', desc: 'Stop the old one, start the new one.', tags: ['Free', 'No way back'],
            fx: (s) => { rep(s, -10); grow(s, 0.95); }, verdict: 'bad', learn: ['bluegreen', 'canary'],
            out: 'Twenty minutes in, a memory leak takes down every server at once — at lunchtime peak. The old version is gone. You’re down for 50 minutes rebuilding it.', note: 'All users, all at once, no undo.' }
        ] } },
      { if: (s) => s.flags.safeDeploy, ramp: {} }
    ] },

    { id: 'shard', ch: 2, users: 420000, title: 'The wall', dodge: { if: (s) => s.arch.shards > 1, learn: ['sharding', 'hotkey', 'consistenthash'],
        say: 'Writes keep climbing, and your database — already split into shards — spreads them evenly. Quack mentions that most companies hit this wall face-first. You walked around it.' }, steps: [
      { say: [['pager', 'database-1 write queue growing. Disk I/O 99%.'], ['quack', 'This is the one I was dreading. Caches and replicas help reads. But every WRITE still goes to one machine, and you can’t rent a bigger one. They don’t make one.']] },
      { choose: { who: 'quack', prompt: 'One database can’t absorb all the writes any more. You need to split the data across several. Split it how?',
        gun: 1, symptoms: ['database-1 writes: 100% of capacity', 'replicas: no help (they only take reads)', 'next machine size up: does not exist'],
        hint: 'A good split spreads traffic EVENLY. Which key is the same size for everybody?',
        options: [
          { label: 'Split by a scramble of the user ID', desc: 'Each user’s data lands on a database chosen by hashing their ID. Even spread; cross-user queries get harder.', tags: ['$1,000', 'Even load'], cost: 1000,
            fx: (s) => { pay(s, 1000); s.arch.shards = 2; s.flags.goodShard = true; }, verdict: 'great', learn: ['sharding', 'hotkey'],
            out: 'Two shards, each with half the users, each comfortably busy. When you need more room, you add shards. The write ceiling is gone.', note: 'Hashing spreads everyone evenly.' },
          { label: ['Split by product category', 'Split by city'], desc: ['Electronics on one database, fashion on another…', 'Each city gets its own database.'], tags: ['$1,000', 'Easy to reason about', 'Uneven'], cost: 1000,
            fx: (s) => { pay(s, 1000); s.arch.shards = 2; s.flags.hotShard = true; rep(s, -3); }, verdict: 'ok', learn: ['sharding', 'hotkey'],
            out: ['It’s tidy on the whiteboard. Then a phone launch sends 80% of traffic to the Electronics shard while Garden Furniture sits idle. (Your shards are lopsided — they deliver less than they should.)', 'It’s tidy on the whiteboard. Then Friday night sends 80% of traffic to the Mumbai shard while smaller cities sit idle. (Your shards are lopsided — they deliver less than they should.)'], note: 'One slice gets everything; the rest nap.' },
          { label: 'Archive old data to make room', desc: 'Move last year’s records elsewhere.', tags: ['$200', 'Buys weeks'], cost: 200,
            fx: (s) => { pay(s, 200); rep(s, -4); }, verdict: 'bad', learn: ['sharding'],
            out: 'The disk has more room. The write traffic is exactly the same. You’ve tidied the garage while the house is on fire. (Sharding is in the Build panel.)', note: 'Less data stored ≠ fewer writes per second.' }
        ] } },
      { if: (s) => s.arch.shards > 1, choose: { who: 'quack', prompt: 'You’ll add more shards later. With “user ID mod number-of-shards”, going from 2 to 3 shards moves almost every user to a different database. Alternatives?', hint: 'Picture the shards on a circle. Add one — who has to move?',
        options: [
          { label: 'Place shards on a ring; each user belongs to the next shard clockwise', desc: 'Adding a shard only steals a slice from its neighbour.', tags: ['Smooth growth'],
            fx: (s) => { s.flags.chash = true; }, verdict: 'great', learn: ['consistenthash'],
            out: 'Consistent hashing. Adding a shard now moves a small slice of users instead of nearly all of them. Future-you sends thanks. (Adding shards is cheaper from now on.)', note: 'Add a shard, move a sliver.' },
          { label: 'Keep “mod N” and migrate everything each time', desc: 'Simple maths. Big moving day whenever you grow.', tags: ['Simple', 'Painful later'],
            fx: () => {}, verdict: 'ok', learn: ['consistenthash'],
            out: 'It’s fine until the day you add a shard and spend a weekend moving 80% of your data while the site limps.', note: 'Every growth step is moving day.' }
        ] } }
    ] },

    // ───────────────────────── CHAPTER 4 ─────────────────────────
    { id: 'region', ch: 3, users: 600000, title: 'REGION DOWN', dodge: { if: (s) => s.arch.multiRegion, learn: ['failover', 'multiregion', 'availability'],
        say: 'A cooling failure takes down your cloud provider’s entire main region. Half the internet goes dark. {co} wobbles for forty seconds while traffic shifts to your second region, then carries on. A news site lists “apps that stayed up”. There’s only one name on it.' }, steps: [
      { say: [['pager', 'ALL SYSTEMS UNREACHABLE. Region ap-south: total outage.'], ['maya', 'Is it us?? Twitter says half the internet is down. Tell me it’s not just us.'], ['quack', 'It’s the whole data centre region. Cooling failure. Everything you own lives in that one building.']] },
      { choose: { who: 'pager', urgent: 45, timeout: 0, prompt: 'Your cloud provider’s entire region is dark. Everything you run is inside it.', before: (s) => { s.incident = { pen: 70, err: 0.9 }; },
        symptoms: ['region ap-south: OFFLINE', 'your servers: 0 reachable', 'your databases: 0 reachable', 'provider status page: “investigating”'],
        hint: 'Right now you can only choose how to wait. The real decision comes after.',
        options: [
          { label: 'Wait for the provider to recover', desc: 'Nothing to do but refresh the status page.', tags: ['Free', 'Hours'],
            fx: (s) => { rep(s, -14); grow(s, 0.92); }, verdict: 'ok', learn: ['availability', 'spof'],
            out: 'Five hours and ten minutes. You refreshed the status page 900 times. Your whole company was a single point of failure with a nice logo.', note: 'Your whole company was the single point of failure.' },
          { label: 'Rebuild from last night’s backup in another region', desc: 'Stand everything up elsewhere by hand. Lose today’s data.', tags: ['$3,000', '3 hours', 'Lose a day of data'], cost: 3000,
            fx: (s) => { pay(s, 3000); rep(s, -10); grow(s, 0.95); }, verdict: 'ok', learn: ['failover', 'availability'],
            out: ['Three frantic hours later you’re up in another region — minus everything since last night’s backup. 14,000 orders have to be reconstructed from emails.', 'Three frantic hours later you’re up in another region — minus everything since last night’s backup. 14,000 trips have to be reconstructed from receipts.'], note: 'Back sooner, missing a day of data.' }
        ] }, after: (s) => { s.incident = null; } },
      { say: [['viktor', 'I said I did not want to hear the word “outage”. I heard it on the NEWS. What is the plan so this never happens again?']] },
      { choose: { who: 'viktor', prompt: 'How should {co} survive the loss of a whole region?', hint: 'Two questions: how much data can you afford to lose, and how long can you afford to be dark?',
        options: [
          { label: 'A warm standby in a second region', desc: 'A smaller copy, continuously synced. Takes over in minutes if the main region dies.', tags: ['$8,000', '+40% running cost', 'Minutes to recover'], cost: 8000,
            fx: (s) => { pay(s, 8000); s.arch.multiRegion = true; s.flags.passive = true; rep(s, 4); }, verdict: 'great', learn: ['failover', 'multiregion'],
            out: 'Active-passive. A second region shadows the first, ready to take over within minutes. A sensible amount of insurance for a company your size.', note: 'Minutes of downtime at a moderate price.' },
          { label: 'Run fully live in two regions at once', desc: 'Both serve real users all the time. Lose one and the other just carries on.', tags: ['$20,000', '+80% running cost', 'Seconds to recover'], cost: 20000,
            fx: (s) => { pay(s, 20000); s.arch.multiRegion = true; rep(s, 6); }, verdict: 'great', learn: ['multiregion', 'failover', 'availability'],
            out: 'Active-active. Two regions, both live, users routed to the nearest. Nearly double the bill — and the next region failure will be a non-event. Also: your data now lives in two places that must agree. Hold that thought.', note: 'Seconds of downtime at a premium price.' },
          { label: 'Hourly backups to another region', desc: 'If it happens again, restore from at most an hour ago.', tags: ['$500', 'Hours to recover'], cost: 500,
            fx: (s) => { pay(s, 500); s.flags.backups = true; }, verdict: 'ok', learn: ['failover'],
            out: 'Cheap, and far better than nightly. You’ll still be down for hours next time — but you’ll lose an hour of data, not a day. (Multi-region is in Build.)', note: 'Cheap; still hours in the dark.' }
        ] } }
    ] },

    { id: 'cap', ch: 3, users: 900000, title: 'The split', cond: (s) => s.arch.multiRegion || s.arch.replicas > 0, steps: [
      { say: [['pager', 'Network partition: database sites cannot reach each other.'], ['quack', 'Both halves of your database are alive and healthy. They just can’t talk to each other. Each one has customers in front of it right now. This is the famous one. There’s a theorem.']] },
      { choose: { who: 'quack', urgent: 55, timeout: 1, prompt: 'Your two data sites can’t see each other. Users are hitting both. What does each side do?',
        symptoms: ['site A ⇹ site B: link down', 'site A: healthy, serving users', 'site B: healthy, serving users', 'they cannot agree on anything until the link returns'],
        hint: ['Is a shopping cart the same kind of data as a payment?', 'Is a saved “home address” the same kind of data as a driver assignment?'],
        options: [
          { label: 'Depends on the data — stay open for low-stakes, pause the high-stakes', desc: ['Carts, browsing, wish-lists keep working on both sides and merge later. Payments and stock wait for the link.', 'Browsing, fare estimates and profiles keep working on both sides. Payments and driver assignment wait for the link.'], tags: ['Nuanced', 'Best of both'],
            fx: (s) => { s.flags.cap = true; rep(s, 5); }, verdict: 'great', learn: ['cap', 'eventual'],
            out: 'Exactly right. CAP isn’t one choice for the whole company — it’s a choice per kind of data. Nobody loses money; almost nobody notices. The link returns in six minutes and the two sides reconcile.', note: 'Choose per kind of data, not per company.' },
          { label: 'Both sides keep accepting everything; sort it out later', desc: 'Always available. The two sides may disagree for a while.', tags: ['Always up', 'Conflicts'],
            fx: (s) => { s.flags.cap = true; rep(s, -4); pay(s, 3000); }, verdict: 'ok', learn: ['cap', 'eventual'],
            out: ['You stayed up! And each side sold the same last 200 items. Untangling it costs $3,000 in refunds. Availability was right for carts — and wrong for stock.', 'You stayed up! And each side assigned the same 200 drivers to different riders. Untangling it costs $3,000 in credits. Availability was right for browsing — and wrong for dispatch.'], note: 'Up, and now two versions of the truth.' },
          { label: 'Refuse all writes until the link is back', desc: 'Never be wrong. Show “try again shortly”.', tags: ['Always correct', 'Looks like an outage'],
            fx: (s) => { s.flags.cap = true; rep(s, -6); }, verdict: 'ok', learn: ['cap'],
            out: 'Nothing was ever inconsistent. Also nobody could add anything to a cart for six minutes, which did not need to be protected like a bank vault.', note: 'Correct, and closed for business.' }
        ] } }
    ] },

    { id: 'modern', ch: 3, users: 1300000, title: 'The big ball of mud', steps: [
      { say: [
        ['maya', 'We’re 60 engineers now! …Why does every release take three weeks?'],
        ['quack', ['Because {co} is one enormous program. Sixty people editing it at once. A typo in the “reviews” code took down checkout last Tuesday. One deploy takes three hours and everyone holds their breath.', 'Because {co} is one enormous program. Sixty people editing it at once. A typo in the “ratings” code took down dispatch last Tuesday. One deploy takes three hours and everyone holds their breath.']],
        ['viktor', 'My other portfolio company rewrote everything as “microservices”. It took two years and they are bankrupt now. But I hear it’s very modern.']
      ] },
      { choose: { who: 'quack', prompt: 'The monolith is slowing sixty engineers down. How do you modernise it?', hint: 'Which plan lets you stop halfway and still have a working company?',
        options: [
          { label: 'Peel off one piece at a time behind a single front door', desc: 'Put a gateway in front. Carve out payments first, route its traffic to the new service, repeat. The old system keeps running throughout.', tags: ['$6,000', 'Gradual', 'Always shippable'], cost: 6000,
            fx: (s) => { pay(s, 6000); s.arch.micro = true; s.flags.strangler = true; rep(s, 4); }, verdict: 'great', learn: ['microservices', 'strangler', 'apigateway'],
            out: 'The strangler-fig approach. Payments moves out first, then search, then notifications — each one a small, reversible step. Six months later the monolith is a husk and nobody can name the day it happened.', note: 'Gradual, reversible, never stops shipping.' },
          { label: 'Freeze features and rewrite everything as small services', desc: 'Six months, clean slate, one glorious launch.', tags: ['$25,000', '6-month freeze', 'High risk'], cost: 25000,
            fx: (s) => { pay(s, 25000); s.arch.micro = true; s.flags.bigbang = true; rep(s, -8); s.boost = { mult: 0.6, days: 30 }; }, verdict: 'bad', learn: ['microservices', 'strangler'],
            out: 'The rewrite takes eleven months, not six. Competitors ship features the whole time. The launch has 400 bugs the old system fixed years ago. You get there — bruised, poorer and slower.', note: 'The legendary big-bang rewrite. Legendary for a reason.' },
          { label: 'Keep one program, but draw hard walls inside it', desc: 'Clear modules with strict boundaries, one deploy. Less glamorous.', tags: ['$2,000', 'Pragmatic'], cost: 2000,
            fx: (s) => { pay(s, 2000); s.flags.modular = true; rep(s, 2); }, verdict: 'ok', learn: ['microservices'],
            out: 'A modular monolith. Teams stop tripping over each other, and you skip the distributed-systems tax. Deploys are still all-or-nothing, but honestly? Plenty of big companies stop here.', note: 'Unfashionable and perfectly respectable.' }
        ] } }
    ] },

    { id: 'cascade', ch: 3, users: 1800000, title: 'One slow friend', dodge: { if: (s) => s.arch.breaker, learn: ['breaker', 'retries'],
        say: 'Your payment provider has a bad afternoon — replies take 30 seconds. Your circuit breaker notices, stops calling them, and shows customers “Payment is slow right now, we’ve saved your order.” Everything else stays fast. The provider’s other customers are not so lucky.' }, steps: [
      { say: [['pager', 'Everything is slow. Home page 14 s. Search 11 s. Login timing out.'], ['quack', 'Everything’s slow at once, but nothing of YOURS is broken. Look closer. One outside service is taking 30 seconds to answer… and everyone is waiting in line for it.']] },
      { choose: { who: 'pager', urgent: 50, timeout: 1, prompt: 'The payment provider is slow. Somehow that’s taking down pages that have nothing to do with payments.', before: (s) => { s.incident = { pen: 40, err: 0.35 }; },
        gun: 0, symptoms: ['payment-provider.com: 30,000 ms per call', 'app threads waiting on payments: 100%', 'threads free for anything else: 0', 'automatic retries: 3× per failed call'],
        hint: 'Your servers are all standing in a queue for one sick service. How do you make them stop queueing?',
        options: [
          { label: 'Give up quickly on the slow service, and stop calling it for a while', desc: 'Short timeouts. After repeated failures, skip the call entirely and show a fallback; test again every so often.', tags: ['$500', 'Contains the damage'], cost: 500,
            fx: (s) => { pay(s, 500); s.arch.breaker = true; rep(s, 3); }, verdict: 'great', learn: ['breaker', 'retries'],
            out: 'A circuit breaker trips. Calls to the sick provider fail in 5 ms instead of hanging for 30 seconds; threads free up; the rest of the site springs back. Customers see “payments are delayed, we saved your order”.', note: 'Fail fast and keep the rest alive.' },
          { label: 'Retry failed calls more aggressively', desc: 'If at first you don’t succeed…', tags: ['Free', 'Makes it worse'],
            fx: (s) => { rep(s, -12); grow(s, 0.95); }, verdict: 'bad', learn: ['retries', 'breaker'],
            out: 'You tripled the traffic to a service that was already drowning. It dies completely. You have built a retry storm — a denial-of-service attack on your own supplier.', note: 'You became the attack.' },
          { label: 'Double the servers', desc: 'More threads to wait with.', tags: ['$1,500', 'More people in the queue'], cost: 1500,
            fx: (s) => { pay(s, 1500); if (s.arch.lb) s.arch.count += 4; rep(s, -6); }, verdict: 'ok', learn: ['breaker'],
            out: 'Twice as many threads are now stuck waiting on the same sick service. It bought you four minutes.', note: 'A longer queue for the same closed door.' }
        ] }, after: (s) => { s.incident = null; } }
    ] },

    { id: 'hack2', ch: 3, users: 2300000, title: 'HACK ALERT — the flood', dodge: { if: (s) => s.arch.waf, learn: ['waf'],
        say: 'A botnet throws 2 million requests a second at {co}, with SQL-injection probes mixed in. Your shield soaks it up at the edge; your servers never even see it. A message arrives: “ok. that was annoying. — nb”' }, steps: [
      { say: [['pager', 'Inbound traffic 40× normal. Source: 190,000 devices worldwide.'], ['nb', 'remember me? i brought friends. 190,000 of them. baby monitors, mostly. also i left some presents in your search box — try typing  \' OR 1=1 --'], ['nb', 'make it stop for 5 bitcoin. clock’s ticking :)']] },
      { choose: { who: 'pager', urgent: 45, timeout: 2, prompt: 'A massive flood of junk traffic, with database attack strings hidden inside it.', before: (s) => { s.incident = { pen: 45, err: 0.4 }; },
        gun: 2, symptoms: ['requests/sec: 2,100,000 (normal: 50,000)', 'sources: 190,000 hijacked devices', 'payloads include:  \' OR 1=1 --   and   ; DROP TABLE', 'your servers: saturated'],
        hint: 'You can’t out-scale 190,000 baby monitors. Where should junk be thrown away — at your door, or far up the street?',
        options: [
          { label: 'Put a filtering shield in front of everything, out at the edge', desc: 'A global network absorbs the flood; a firewall inspects requests and drops attack patterns before they reach you.', tags: ['$800', '$20/day'], cost: 800,
            fx: (s) => { pay(s, 800); s.arch.waf = true; if (!s.arch.cdn) s.arch.cdn = true; rep(s, 3); }, verdict: 'great', learn: ['waf'],
            out: 'The shield goes up. The flood breaks against a network a thousand times bigger than nullbyte’s botnet, and the injection strings are stripped at the edge. Your servers go quiet.', note: 'Fight the flood far from your front door.' },
          { label: 'Pay the 5 bitcoin', desc: 'Make it go away.', tags: ['$30,000', 'They’ll be back'], cost: 30000,
            fx: (s) => { pay(s, 30000); rep(s, -5); }, verdict: 'bad', learn: ['waf'],
            out: 'It stops. For nine days. Then the price is 10 bitcoin. You are now on a list titled “pays”.', note: 'You’re now on a list titled “pays”.' },
          { label: 'Block every country outside your main market', desc: 'Most of the botnet is abroad.', tags: ['Free', 'Blunt'],
            fx: (s) => { rep(s, -8); grow(s, 0.94); }, verdict: 'ok', learn: ['waf'],
            out: 'Half the flood disappears — along with every legitimate customer abroad. The other half of the botnet is domestic smart fridges.', note: 'Blocks real customers; the fridges are local.' }
        ] }, after: (s) => { s.incident = null; } }
    ] },

    { id: 'saga', ch: 3, users: 2700000, title: 'Paid for nothing', cond: (s) => s.arch.micro || s.arch.queue, steps: [
      { say: [['zoe', ['New flavour of angry: people who were charged, got a confirmation, and then… no order. It just doesn’t exist.', 'New flavour of angry: people who were charged, got a confirmation, and then… no ride. It just doesn’t exist.']], ['quack', ['Payments said yes. Then the inventory service crashed mid-order. In the old single database, the whole thing would have rolled back together. Now those are separate services with separate databases.', 'Payments said yes. Then the dispatch service crashed mid-booking. In the old single database, the whole thing would have rolled back together. Now those are separate services with separate databases.']]] },
      { choose: { who: 'quack', prompt: 'One business action now spans several services. Step 2 succeeded, step 3 failed. How do you keep things consistent?', hint: 'You can’t un-happen a payment. But you can do something that cancels it out.',
        options: [
          { label: 'Give every step an “undo”, and run the undos when a later step fails', desc: 'Payment succeeded but stock failed → automatically refund. Each service stays independent.', tags: ['Resilient', 'More to design'],
            fx: (s) => { s.flags.saga = true; rep(s, 4); }, verdict: 'great', learn: ['saga'],
            out: 'The saga pattern. Every step has a compensating action; failures unwind themselves. The customer gets “sorry — refunded” within seconds instead of a mystery charge.', note: 'Every step ships with its own “never mind”.' },
          { label: 'Make all services lock and commit together', desc: 'A coordinator asks everyone “ready?”, then “commit!”. Nobody moves until all agree.', tags: ['Strict', 'Slow', 'Coordinator can stall everything'],
            fx: (s) => { s.flags.saga = true; s.flags.twopc = true; rep(s, 1); }, verdict: 'ok', learn: ['saga'],
            out: 'Two-phase commit. It is correct. It also holds locks across the network, and when the coordinator hiccups, everything freezes. Checkout gets noticeably slower.', note: 'Correct, slow, and fragile under failure.' },
          { label: 'A nightly job that finds mismatches', desc: 'Reconcile payments and orders every night.', tags: ['Cheap', 'A full day late'],
            fx: (s) => { rep(s, -4); }, verdict: 'ok', learn: ['saga'],
            out: 'Useful as a safety net; terrible as the only net. Customers wait up to 24 hours to learn where their money went.', note: 'Good backup plan, bad only plan.' }
        ] } }
    ] },

    // ───────────────────────── CHAPTER 5 ─────────────────────────
    { id: 'chaos', ch: 4, users: 3200000, title: 'Break it on purpose', steps: [
      { say: [
        ['maya', ['It’s official. {co} MEGA SALE DAY. Six weeks from now. A pop star is announcing it live on TV. The whole country will show up at 8 PM sharp.', 'It’s official. {co} is the ride partner for New Year’s Eve in twelve cities. Six weeks from now. At 12:01 AM, everyone goes home at once.']],
        ['viktor', 'If this goes well, we go public. If it goes badly, I will be very calm about it. Too calm.'],
        ['quack', 'Six weeks. Here’s a thought that sounds insane: what if we broke things ourselves, now, on a quiet Tuesday, to see what happens?']
      ] },
      { choose: { who: 'quack', prompt: 'How do you find out whether the system will survive the big day?', hint: 'Would you rather meet your weaknesses on a Tuesday afternoon or on live TV?',
        options: [
          { label: 'Deliberately kill servers and cut links in production, during office hours', desc: 'Controlled experiments: pull a plug, watch what breaks, fix it, repeat.', tags: ['Scary', 'Finds the unknowns'],
            fx: (s) => { s.flags.chaos = true; rep(s, 3); }, verdict: 'great', learn: ['chaos', 'loadtest'],
            out: 'Chaos engineering. You kill a database replica: fine. You kill a cache node: the site melts — every server stampedes the database at once. You’d never have guessed. You fix it in a calm afternoon instead of on live TV.', note: 'Meet your failures on your own schedule.' },
          { label: 'Simulate 3× peak traffic against a copy of the system', desc: 'A rehearsal crowd. Finds capacity limits, not failure behaviour.', tags: ['Sensible', 'Half the picture'],
            fx: (s) => { s.flags.loadtest = true; rep(s, 2); }, verdict: 'ok', learn: ['loadtest'],
            out: 'The load test shows you exactly where capacity runs out, and you note what to buy. What it can’t show you is what happens when a part FAILS mid-rush.', note: 'Tests the crowd, not the failures.' },
          { label: 'Don’t touch anything — it’s working', desc: 'If it isn’t broken, don’t poke it.', tags: ['Free', 'Hope'],
            fx: () => {}, verdict: 'bad', learn: ['chaos'],
            out: 'It IS working. Under today’s traffic, on a day when nothing fails. The big day will be neither of those.', note: 'Works today ≠ works on the day.' }
        ] } }
    ] },

    { id: 'bill', ch: 4, users: 4500000, title: 'The bill', dodge: { if: (s) => s.arch.autoscale, learn: ['autoscale'],
        say: 'Viktor reviews the cloud bill, expecting a fight. Your servers scale up at dinner time and melt away at 4 AM — you only pay for what you use. He closes the laptop. “Hm,” he says, which from Viktor is a standing ovation.' }, steps: [
      { say: [['viktor', 'I am looking at the cloud invoice. It has more digits than my first fund. Why are we paying for 400 servers at four in the morning?'], ['quack', 'Because you sized for the 8 PM peak and left it running all night. Your traffic looks like a mountain range. Your fleet looks like a brick.']] },
      { choose: { who: 'viktor', prompt: 'You pay for peak capacity 24 hours a day. Traffic at 4 AM is a tenth of 8 PM.', hint: 'What if the fleet could follow the traffic?',
        options: [
          { label: 'Let the fleet grow and shrink with demand', desc: 'Add servers automatically when load rises, remove them when it falls.', tags: ['$1,500', 'Pay for what you use', 'Handles surprises'], cost: 1500,
            fx: (s) => { pay(s, 1500); s.arch.autoscale = true; rep(s, 2); }, verdict: 'great', learn: ['autoscale'],
            out: 'Autoscaling. The fleet breathes with the traffic: lean at dawn, huge at dinner. The bill drops by a third and — more importantly — surprise crowds now get servers without you lifting a finger.', note: 'Cheaper at 4 AM, safer at 8 PM.' },
          { label: 'Cut the fleet in half permanently', desc: 'Instant savings.', tags: ['Saves money', 'Peak will hurt'],
            fx: (s) => { s.arch.count = Math.max(1, Math.round(s.arch.count / 2)); }, verdict: 'bad', learn: ['autoscale'],
            out: 'The invoice looks wonderful. 8 PM looks like a crime scene.', note: 'Great invoice, terrible evenings.' },
          { label: 'Keep the big fleet; sign a 3-year discount', desc: 'Commit to the brick, pay less per brick.', tags: ['Cheaper per server', 'Still a brick'],
            fx: (s) => { s.flags.reserved = true; }, verdict: 'ok', learn: ['autoscale'],
            out: 'A reasonable finance move for your steady baseline. It does nothing for a crowd bigger than the brick — and one is coming.', note: 'Good for the baseline, useless for surprises.' }
        ] } },
      { if: (s) => s.arch.autoscale, tune: { who: 'quack', prompt: 'Set the trigger: add servers when average CPU passes…',
        values: [20, 30, 40, 50, 55, 60, 65, 70, 80, 90, 98], start: 9, sweet: [50, 65], fmt: (v) => v + '% CPU', lo: 'Jumpy', hi: 'Last-second',
        meters: [{ name: 'Money wasted on idle servers', fn: (v) => 1 - (v - 15) / 50 }, { name: 'Chance a spike outruns the new servers', fn: (v) => (v - 55) / 40 }],
        low: 'You’ll add servers every time someone sneezes. Viktor will see the invoice.', mid: 'Enough headroom for new servers to boot before the old ones drown, without paying for a ghost fleet.', high: 'New servers take a couple of minutes to boot. At this setting, the spike has already won by then.' } }
    ] },

    { id: 'nullbyte', ch: 4, users: 6000000, title: 'An unexpected email', steps: [
      { say: [
        ['nb', 'hey. it’s me. don’t panic.'],
        ['nb', 'i found a real one this time. your admin panel trusts an internal header that anyone can forge. i could read every customer record you have. i haven’t.'],
        ['nb', 'i’ve been poking at you since you were in a garage. you kept getting better. it got less fun to break you and more fun to watch. so. what do you want to do with this?']
      ] },
      { choose: { who: 'nb', prompt: 'nullbyte is offering to disclose a serious vulnerability.', hint: 'Who would you rather have testing your walls: people you pay, or people you don’t?',
        options: [
          { label: 'Thank them, fix it, pay a reward — and start a bug-bounty programme', desc: 'Make it official: hackers get paid for telling you first.', tags: ['$5,000', 'An ally'], cost: 5000,
            fx: (s) => { pay(s, 5000); s.flags.bounty = true; rep(s, 5); }, verdict: 'great', learn: ['bounty'],
            out: 'You patch it within the hour and send $5,000. The reply: “a pleasure doing business. i’ll be watching on the big day. from the inside this time — put me on the list.” You have a security consultant now. They have a hoodie.', note: 'Turn the adversary into the alarm system.' },
          { label: 'Quietly fix it and don’t reply', desc: 'Take the gift. Say nothing.', tags: ['Free', 'Rude'],
            fx: (s) => { s.flags.patched = true; }, verdict: 'ok', learn: ['bounty'],
            out: 'Patched. No reply sent. Somewhere, a person in a hoodie shrugs and wonders whether to bother next time.', note: 'Fixed today; nobody warns you tomorrow.' },
          { label: 'Send lawyers', desc: 'This is unauthorised access. Threaten to sue.', tags: ['$10,000', 'Makes an enemy'], cost: 10000,
            fx: (s) => { pay(s, 10000); s.flags.patched = true; s.flags.enemy = true; rep(s, -4); }, verdict: 'bad', learn: ['bounty'],
            out: 'The legal letter bounces off an anonymous inbox. The write-up “How {co} thanks people who report bugs” reaches the front page of every tech forum. Researchers stop reporting to you. They don’t stop finding things.', note: 'Researchers stop reporting, not finding.' }
        ] } }
    ] },

    { id: 'finale', ch: 4, users: 8000000, title: ['Mega Sale Day', 'New Year’s Eve'], special: 'finale' }
  ];

  // The Big Day: every earlier decision gets its moment. test(s, load) → pass/fail.
  G.FINALE = [
    { time: ['7:58 PM', '11:45 PM'], name: 'The crowd arrives', test: (s, l) => l.appUtil <= 1,
      pass: 'Traffic quadruples in two minutes. Your app tier stretches to meet it.',
      fail: 'Traffic quadruples in two minutes. Your app servers hit 100% and start refusing connections.' },
    { time: ['8:00 PM', '12:01 AM'], name: ['Checkout stampede', 'Everyone books at once'], test: (s, l) => l.writeUtil <= 1,
      pass: ['200,000 orders in the first minute. The queue fills, the shards share the load, every order lands.', '200,000 bookings in the first minute. The queue fills, the shards share the load, every booking lands.'],
      fail: ['200,000 orders in the first minute — and the database can’t write them fast enough. Checkouts time out.', '200,000 bookings in the first minute — and the database can’t write them fast enough. Bookings time out.'] },
    { time: ['8:03 PM', '12:04 AM'], name: 'The browse wave', test: (s, l) => l.readUtil <= 1,
      pass: 'Millions of page views — and the cache answers most of them before the database even wakes up.',
      fail: 'Millions of page views crash straight into the database. Pages take 20 seconds.' },
    { time: ['8:07 PM', '12:09 AM'], name: 'Bots', test: (s) => s.arch.ratelimit || s.arch.waf,
      pass: ['Scalper bots swarm the limited drops. Your limiter gives each client a few tries. Real people get the goods.', 'Bots flood the booking endpoint with fake requests. Your limiter gives each client a few tries. Real riders get cars.'],
      fail: ['Scalper bots buy every limited item in four seconds. “SOLD OUT TO BOTS” trends.', 'Bots flood bookings with fake requests. Drivers arrive to empty kerbs all over town.'] },
    { time: ['8:15 PM', '12:20 AM'], name: 'The payment provider stumbles', test: (s) => s.arch.breaker,
      pass: 'The payment provider slows to a crawl. Your circuit breaker trips; orders are saved and charged later. Nobody else in the industry is so lucky.',
      fail: 'The payment provider slows to a crawl — and every thread on your servers waits in line for it. The whole site freezes.' },
    { time: ['8:21 PM', '12:26 AM'], name: 'Retries', test: (s) => s.flags.idem,
      pass: 'Thousands of phones on bad connections retry their payments. Each one is charged exactly once.',
      fail: 'Thousands of phones on bad connections retry their payments. Thousands of people are charged twice.' },
    { time: ['8:30 PM', '12:40 AM'], name: ['The last one in stock', 'The last free driver'], test: (s) => s.flags.lock,
      pass: ['40,000 people click “Buy” on 500 signed posters. Exactly 500 get them.', 'Hundreds of riders are matched to the same handful of drivers. Each driver gets exactly one.'],
      fail: ['40,000 people click “Buy” on 500 signed posters. You sell 6,200 of them.', 'One driver gets five riders. Five riders get one very confused driver.'] },
    { time: ['8:44 PM', '12:55 AM'], name: 'A data centre blinks', test: (s) => s.arch.multiRegion,
      pass: 'A power blip takes out part of your main region. Traffic slides over to the second region. The TV host doesn’t even notice.',
      fail: 'A power blip takes out part of your main region. There is no second region. You’re dark for eleven minutes, live on TV.' },
    { time: ['9:02 PM', '1:10 AM'], name: 'The urgent fix', test: (s) => s.arch.cicd,
      pass: 'A pricing bug needs fixing NOW. The pipeline tests and ships the fix in four minutes.',
      fail: 'A pricing bug needs fixing NOW. You deploy by hand, mid-rush, and it takes 50 sweaty minutes.' },
    { time: ['9:10 PM', '1:15 AM'], name: 'Eyes on glass', test: (s) => s.arch.monitoring,
      pass: 'Through it all, your dashboards show every wobble seconds before it matters.',
      fail: 'Through it all, you’re finding out about problems from Twitter.' },
    { time: ['9:30 PM', '1:30 AM'], name: 'The unknown unknown', test: (s) => s.flags.chaos,
      pass: 'A cache node dies. Six weeks ago that would have stampeded the database. You fixed that on a quiet Tuesday. Tonight: nothing happens.',
      fail: 'A cache node dies, and every server stampedes the database at once. Nobody saw it coming, because nobody ever tried it.' },
    { time: ['9:41 PM', '1:42 AM'], name: 'A message', test: (s) => s.flags.bounty,
      pass: 'nullbyte: “someone tried the admin-header trick on you at 9:38. blocked it for you. you’re welcome. nice night.”',
      fail: (s) => s.flags.enemy ? 'nullbyte: “happy big day. remember the lawyers? check your admin panel.” The customer list is on a paste site by ten.' : 'Someone probes your admin panel during the rush. Nobody is watching that door tonight. You find out next week.' }
  ];

  // Small messages that slide in between story beats. Two quick replies each; the game keeps running.
  G.POPUPS = [
    { who: 'maya', text: ['A food blogger with 80k followers wants a free hamper for a shout-out. Send one?', 'A food blogger with 80k followers wants free rides for a week for a shout-out. Deal?'],
      a: { label: 'Send it', fx: (s) => { s.cash -= 60; s.boost = { mult: 1.4, days: 6 }; }, say: 'She posts a reel. Sign-ups jump for a week. (−$60)' }, b: { label: 'No freebies', fx: () => {}, say: 'Fair. She features a competitor instead.' } },
    { who: 'zoe', text: 'A customer wrote the nicest thank-you note I’ve ever seen. Want me to read it to you?',
      a: { label: 'Read it', fx: (s) => { s.xp += 20; rep(s, 1); }, say: '“It just works, every time.” You needed that. +20 XP' }, b: { label: 'Later, busy', fx: () => {}, say: 'Zoe prints it and sticks it to your monitor anyway.' } },
    { who: 'viktor', cond: (s) => s.beat > 5, text: 'A rival had a six-hour outage today. Marketing wants to tweet a joke about it. Approve?',
      a: { label: 'Stay classy', fx: (s) => { rep(s, 2); s.xp += 20; }, say: 'You send their on-call team pizza instead. Engineers everywhere notice. +2 reputation' }, b: { label: 'Roast them', fx: (s) => { s.flags.karma = true; rep(s, -2); }, say: 'It gets 9,000 likes. It will also be quoted back at you during your next outage.' } },
    { who: 'zoe', text: 'People keep asking “is it down or is it just me?”. Should we have a public status page?',
      a: { label: 'Build one ($100)', fx: (s) => { s.cash -= 100; rep(s, 3); }, say: 'status.' + '{co}'.toLowerCase() + '.com goes up. Support tickets during wobbles drop by half.' }, b: { label: 'Not now', fx: () => {}, say: 'Zoe keeps answering “is it down?” by hand.' } },
    { who: 'maya', text: 'Can the home page show a LIVE visitor counter? Updating every second. Investors love a number that moves.',
      a: { label: 'Refresh it every 10 s', fx: (s) => { s.xp += 30; rep(s, 1); }, say: 'Nobody can tell the difference, and the database is asked 6 times a minute instead of 60 per visitor. +30 XP' }, b: { label: 'Sure, every second', fx: (s) => { s.cash -= 300; }, say: 'It looks great. It also costs $300 in extra database load to show a number nobody reads.' } },
    { who: 'pager', text: 'Warning: database disk is 85% full. Mostly old debug logs.',
      a: { label: 'Rotate the logs', fx: (s) => { s.xp += 20; }, say: 'Logs now delete themselves after 14 days. A future 3 AM page just got cancelled. +20 XP' }, b: { label: 'Snooze', fx: (s) => { rep(s, -3); s.health = Math.max(20, s.health - 25); }, say: 'Nine days later the disk fills and the database stops accepting writes for an hour.' } },
    { who: 'zoe', text: 'The new intern wants access to the production database “to look around”. OK?',
      a: { label: 'Read-only copy', fx: (s) => { s.xp += 30; }, say: 'They explore a replica to their heart’s content. Least privilege: give exactly the access the job needs. +30 XP' }, b: { label: 'Full access', fx: (s) => { rep(s, -4); }, say: 'On day two they run an UPDATE without a WHERE clause. Every customer is briefly named “test”.' } },
    { who: 'nb', cond: (s) => s.beat > 9, text: 'fyi your password-reset emails fail spam checks. half your users never get them. you’re welcome.',
      a: { label: 'Fix it ($50)', fx: (s) => { s.cash -= 50; rep(s, 2); s.xp += 20; }, say: 'Three DNS records later, reset emails land in inboxes. nullbyte was… helping?' }, b: { label: 'Ignore the hacker', fx: (s) => { rep(s, -2); }, say: 'Locked-out users keep giving up and leaving.' } },
    { who: 'maya', text: 'A TV crew is here tomorrow. Can they film “the screen with all the graphs”?',
      a: { label: 'Roll cameras', fx: (s) => { if (s.arch.monitoring) { s.boost = { mult: 1.3, days: 5 }; } else rep(s, -1); }, say: (s) => s.arch.monitoring ? 'Your dashboards look fantastic on TV. Sign-ups spike.' : 'There is no screen with graphs. They film Quack instead. He’s a natural.' }, b: { label: 'Not this time', fx: () => {}, say: 'They film the snack shelf.' } },
    { who: 'viktor', cond: (s) => s.beat > 5, text: 'Board dinner tonight. Come charm them, or stay with your servers?',
      a: { label: 'Go to dinner', fx: (s) => { s.cash += 2000; }, say: 'You explain caching using the bread basket. A board member wires $2,000 “for more bread”.' }, b: { label: 'Stay on call', fx: (s) => { s.xp += 25; }, say: 'A quiet night. You finally write the runbook you’ve been postponing. +25 XP' } },
    { who: 'quack', text: 'Fun fact: 99.9% uptime sounds amazing, but it allows almost nine hours of downtime a year. Want the other nines?',
      a: { label: 'Tell me', fx: (s) => { s.xp += 20; }, say: '99% = 3.6 days a year. 99.99% = 52 minutes. 99.999% = 5 minutes. Each nine costs ten times more. +20 XP' }, b: { label: 'I’m good', fx: () => {}, say: 'Quack tells you anyway, quietly, to himself.' } },
    { who: 'maya', text: 'The team wants a hack week: no roadmap, everyone fixes whatever annoys them most. Yes?',
      a: { label: 'Do it', fx: (s) => { rep(s, 2); s.xp += 20; }, say: 'Forty small papercuts vanish in five days. Somebody even fixes the flaky test.' }, b: { label: 'Roadmap first', fx: () => {}, say: 'The papercuts remain. So does the flaky test.' } }
  ];

  G.ENDINGS = [
    { min: 11, rank: 'LEGEND', title: 'The night nothing happened',
      text: ['The pop star said the name. Eleven million people showed up. And {co} just… worked. No headlines about crashes, because there were none. The best infrastructure story is the one nobody tells.\n\nViktor rings the stock-exchange bell six months later. Maya cries on camera. Zoe’s inbox has four emails, all compliments. nullbyte sends a duck emoji.\n\nQuack sits on a desk in a much bigger office now. Same duck. “You know,” he says, “you never did write any code.”', 'Midnight struck in twelve cities. Eleven million people wanted to go home at once. And {co} just… worked. No headlines about stranded crowds, because there were none. The best infrastructure story is the one nobody tells.\n\nViktor rings the stock-exchange bell six months later. Maya cries on camera. Zoe’s inbox has four emails, all compliments. nullbyte sends a duck emoji.\n\nQuack sits on a desk in a much bigger office now. Same duck. “You know,” he says, “you never did write any code.”'] },
    { min: 8, rank: 'SENIOR ARCHITECT', title: 'Bent, never broke',
      text: 'There were a few bad minutes. A graph or two went red; one apology email went out. But the system bent and came back, and by morning the numbers were the best in company history.\n\nViktor calls it “acceptable”, which is the nicest thing he has ever said. Maya is already planning next year, twice as big. Quack has a list of the things that wobbled. It’s a short list. You know exactly what to build next.' },
    { min: 5, rank: 'SURVIVOR', title: 'It’s fine. Everything’s fine.',
      text: 'It was not a clean night. Parts of {co} went down, came back, and went down again. You held it together with restarts, apologies and a truly historic amount of coffee.\n\nThe company survives. The reviews are… mixed. Every failure tonight traced back to a decision you can now name. Quack: “Good news — you know what you’d do differently. That’s called experience. It’s what you get right after you needed it.”' },
    { min: 0, rank: 'CAUTIONARY TALE', title: 'The outage that got its own hashtag',
      text: 'It started at 8:00 and never really stopped. The error page trended. A news anchor read your status message aloud, slowly.\n\nMaya doesn’t blame you. Viktor is very, very calm. And Quack? “Every architect has a night like this,” he says. “The good ones only have it once. Want to go again? You know so much more than you did in that garage.”' }
  ];
})();
