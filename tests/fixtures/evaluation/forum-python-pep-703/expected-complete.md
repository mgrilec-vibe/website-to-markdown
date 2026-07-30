[Skip to last reply](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/131) [Skip to top](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/1)

[Skip to main content](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606#main-container)

[![Discussions on Python.org](https://us1.discourse-cdn.com/flex002/uploads/python1/original/1X/c7591c98caf3b31d4d9c6f322f41ed9d80a50800.png)](https://discuss.python.org/)

Sign Up Log In

-   ​
-   ​

​

Please read our [Community Guidelines](https://discuss.python.org/guidelines/) that are tailored to this space in addition to the Python Software Foundation Code of Conduct that we’re bound by.

Reach out to [@moderators](https://discuss.python.org/groups/moderators) with any questions.

# [PEP 703: Making the Global Interpreter Lock Optional](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606)

[PEPs](https://discuss.python.org/c/peps/19)

You have selected **0** posts.

select all

cancel selecting

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/1 "Jump to the first post")

1 / 130

Jan 2023

[Oct 2024](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/131)

## post by ambv on Jan 10, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/ambv/48/25884_2.png)](https://discuss.python.org/u/ambv)

[Łukasz Langa](https://discuss.python.org/u/ambv) [ambv](https://discuss.python.org/u/ambv) [CPython core developer](https://discuss.python.org/g/committers)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606 "Post date")

Hi ![:wave:](https://emoji.discourse-cdn.com/apple/wave.png?v=15 ":wave:")

As the sponsor of [@colesbury](https://discuss.python.org/u/colesbury)’s PEP, I’d like to invite you all to discuss the proposal to solve the biggest scalability limitation of CPython by making it possible to build a version of the interpreter which doesn’t use the Global Interpreter Lock.

The document is somewhat of a demanding read as it’s one of the top 10 longest PEPs. That was to be expected though as the problem goes back decades and requires nuance, trade-offs, and careful consideration of alternatives. Thanks in advance for your time reading the PEP and iterating on it with us.

Our hope with this PEP is to get a definitive answer to the GIL question once and for all. We look forward to your feedback!

– Sam Gross and Łukasz Langa

# [](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606#p-80646-see-the-latest-version-of-the-pep-1)See the latest version of the PEP

![](https://us1.discourse-cdn.com/flex002/uploads/python1/original/2X/8/88d4484552c4beac33d9a0848f523aaa66aad78c.png) [Python Enhancement Proposals (PEPs)](https://peps.python.org/pep-0703/)

![](https://us1.discourse-cdn.com/flex002/uploads/python1/original/3X/8/3/8354042ac932196b5fde1d1048a76b567decdcdc.png)

### [PEP 703 – Making the Global Interpreter Lock Optional in CPython |...](https://peps.python.org/pep-0703/)

CPython’s global interpreter lock (“GIL”) prevents multiple threads from executing Python code at the same time. The GIL is an obstacle to using multi-core CPUs from Python efficiently. This PEP proposes adding a build configuration (--disable-gil)...

([python.org](http://python.org/) uses aggressive front-end caching so you might need to refresh the page your browser to see latest changes)

![heart](https://emoji.discourse-cdn.com/apple/heart.png?v=15 "heart")

120

1 Reply

​

​

-   [A fast, free threading Python](https://discuss.python.org/t/a-fast-free-threading-python/27903/111)
-   [Is Free-Threading Our Only Option?](https://discuss.python.org/t/is-free-threading-our-only-option/91775/100)

40.1k views 632 likes 50 links 48 users

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/colesbury/48/28031_2.png "Sam Gross") 18](https://discuss.python.org/u/colesbury "colesbury")

[![](https://avatars.discourse-cdn.com/v4/letter/b/e9c0ed/48.png "Barry Scott") 11](https://discuss.python.org/u/barry-scott "barry-scott")

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/renejsum/48/2940_2.png "Rene Nejsum") 8](https://discuss.python.org/u/renejsum "renejsum")

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/ajoino/48/6907_2.png "Jacob Nilsson") 6](https://discuss.python.org/u/ajoino "ajoino")

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/stonebig/48/2796_2.png "Stonebig") 6](https://discuss.python.org/u/stonebig "stonebig")

read 37 min

Top replies

## post by ajoino on Jan 10, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/ajoino/48/6907_2.png)](https://discuss.python.org/u/ajoino)

[Jacob Nilsson](https://discuss.python.org/u/ajoino) [ajoino](https://discuss.python.org/u/ajoino)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/2 "Post date")

Exciting stuff!

![heart](https://emoji.discourse-cdn.com/apple/heart.png?v=15 "heart")

5

​

​

## post by cirospaciari on Jan 10, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/cirospaciari/48/10538_2.png)](https://discuss.python.org/u/cirospaciari)

[Ciro Spaciari](https://discuss.python.org/u/cirospaciari)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/3 "Post date")

awesome news!

​

​

## post by ambv on Jan 10, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/ambv/48/25884_2.png)](https://discuss.python.org/u/ambv)

[Łukasz Langa](https://discuss.python.org/u/ambv) [ambv](https://discuss.python.org/u/ambv) [CPython core developer](https://discuss.python.org/g/committers)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/4 "Post date")

I’m happy to see enthusiasm for the PEP. However, **please note** that on Discourse we avoid posts to show support / agree with the previous poster. Instead, we use the reactions:

[![Screen Shot 2023-01-10 at 18.30.10](https://us1.discourse-cdn.com/flex002/uploads/python1/optimized/2X/2/2c441545dc69401836f2d6061e5ed827b2cb9fad_2_502x499.jpeg)

Screen Shot 2023-01-10 at 18.30.101824×1816 152 KB

](https://us1.discourse-cdn.com/flex002/uploads/python1/original/2X/2/2c441545dc69401836f2d6061e5ed827b2cb9fad.jpeg "Screen Shot 2023-01-10 at 18.30.10")

Please use those instead. Thanks!

![heart](https://emoji.discourse-cdn.com/apple/heart.png?v=15 "heart")

21

1 Reply

​

​

## post by barry-scott on Jan 10, 2023

[![](https://avatars.discourse-cdn.com/v4/letter/b/e9c0ed/48.png)](https://discuss.python.org/u/barry-scott)

[Barry Scott](https://discuss.python.org/u/barry-scott)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/5 "Post date")

Thanks you for a clear PEP for such a technically complex change!

I am the PyCXX maintainer.

I think I may need to know if PYCXX needs to use `—without-gil` safe APIs.

Is there a C define that I can test? Found it: Py\_NOGIL

Or maybe PyCXX always uses the safe APIs starting with the first release of python with this implemented.

If a C extension uses an unsafe API will I get a compiler error?

1 Reply

​

​

## post by h-vetinari on Jan 10, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/h-vetinari/48/1220_2.png)](https://discuss.python.org/u/h-vetinari)

[H. Vetinari](https://discuss.python.org/u/h-vetinari)

1

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/6 "Post date")

Congratulations on this PEP! ![:partying\_face:](https://emoji.discourse-cdn.com/apple/partying_face.png?v=12 ":partying_face:")

> This proposed immortalization scheme is very similar to PEP 683, but with slightly different bit representation in the reference count fields for immortal objects in order to work with biased reference counting and deferred reference counting.

I’m surprised to see this diverge from existing efforts in the same direction. Is it impossible to make nogil work with PEP 683 semantics, should PEP 683 be modified, or what are the trade-offs (performance?) if PEP 683 were used as is?

Another point that struck me is that, despite investing a lot of digital ink into testimonials, the motivation is almost exclusively ML/AI and scientific computing. I imagine it’s hard to capture the vast volume of discussions on this topic, but my impression is that it does a disservice to the PEP to not cover the impact on other usecases as well, especially considering how the addition of another build mode / ABI will create enormous pressure for _all_ extension library authors to support it.

In fact, I suspect that pressure would be so high that there wouldn’t be much of a difference to just declaring it as the new default, which then leaves all of the downsides of building everything twice, with few of the benefits of having a build option in the first place .

---

1.  Perhaps it might be better to just use this as a “Python 4.0” event, which would at least give library authors something to point to à la “a lot of things changed and we’ll need some time to adapt our library to it”. [↩︎](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606#footnote-ref-80717-1)

![heart](https://emoji.discourse-cdn.com/apple/heart.png?v=15 "heart")

9

2 Replies

​

​

## post by barry-scott on Jan 10, 2023

[![](https://avatars.discourse-cdn.com/v4/letter/b/e9c0ed/48.png)](https://discuss.python.org/u/barry-scott)

[Barry Scott](https://discuss.python.org/u/barry-scott)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/7 "Post date")

I use case i have at work is a service that uses multi process because of the gil issue.
It handles high volumes of http requests and needed to compute for the requests.

This PEP would allow us to use a multi threaded server where we can exploit all the cores on our xeon’s and have the service scale with CPU cores.

![heart](https://emoji.discourse-cdn.com/apple/heart.png?v=15 "heart")

2

​

​

## post by jeanas on Jan 10, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/jeanas/48/8115_2.png)](https://discuss.python.org/u/jeanas)

[Jean Abou Samra](https://discuss.python.org/u/jeanas) [jeanas](https://discuss.python.org/u/jeanas)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/8 "Post date")

![](https://sea2.discourse-cdn.com/flex016/user_avatar/discuss.python.org/ambv/48/25884_2.png) Łukasz Langa:

[](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/4 "go to the quoted post")

> However, **please note** that on Discourse we avoid posts to show support / agree with the previous poster. Instead, we use the reactions:

The problem is that there’s no way to express a stronger excitement than just “like” ![:slight\_smile:](https://emoji.discourse-cdn.com/apple/slight_smile.png?v=12 ":slight_smile:")

Minor note: perhaps the PEP should say what happens to the `generation` argument of
[gc.collect](https://docs.python.org/3/library/gc.html#gc.collect).

1 Reply

​

​

## post by methane on Jan 11, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/methane/48/43_2.png)](https://discuss.python.org/u/methane)

[Inada Naoki](https://discuss.python.org/u/methane) [methane](https://discuss.python.org/u/methane) [CPython core developer](https://discuss.python.org/g/committers)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/9 "Post date")

Excellent work.

This is nitpick but I don’t like `--with(out)-gil` option. `--with` option usually used for external dependency. Since we don’t need `--with-gil=/path/to/libgil`, I prefer `--enable-gil / --disable-gil` option.

See [3. Adding Options](https://autotools.info/autoconf/arguments.html) for reference.

> **`--enable-*`**/**`--disable-*`** arguments
>
> The arguments starting with **–enable-** prefix are usually used to enable features of the program. They usually add or remove dependencies only if they are needed for that particular feature being enabled or disabled.
>
> **`--with-*`**/**`--without-*`** arguments
>
> The arguments starting with **–with-** prefix are usually used to add or remove dependencies on external projects. These might add or remove features from the project.

![heart](https://emoji.discourse-cdn.com/apple/heart.png?v=15 "heart")

18

1 Reply

​

​

## post by gregington on Jan 11, 2023

[![](https://avatars.discourse-cdn.com/v4/letter/g/c89c15/48.png)](https://discuss.python.org/u/gregington)

[Greg Tan](https://discuss.python.org/u/gregington) [gregington](https://discuss.python.org/u/gregington)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/10 "Post date")

The **Python Critical Sections** part of the document describes how threads can only hold a single lock at a time to avoid deadlocks, where existing locks are released when a new lock is acquired.

If multiple locks are taken to ensure mutual consistency across multiple resources, is it possible that a second thread can acquire a released lock and make changes that are inconsistent with the work performed by the first thread? At first glance, this has the potential to violate program correctness in a multithreaded environment.

1 Reply

​

​

## post by colesbury on Jan 11, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/colesbury/48/28031_2.png)](https://discuss.python.org/u/colesbury)

[Sam Gross](https://discuss.python.org/u/colesbury) [colesbury](https://discuss.python.org/u/colesbury) [CPython core developer](https://discuss.python.org/g/committers)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/11 "Post date")

![](https://avatars.discourse-cdn.com/v4/letter/b/e9c0ed/48.png) Barry Scott:

[](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/5 "go to the quoted post")

> Or maybe PyCXX always uses the safe APIs starting with the first release of python with this implemented.
>
> If a C extension uses an unsafe API will I get a compiler error?

Hi Barry - I think you are referring to `PyDict_GetItem` vs. `PyDict_FetchItem` (and the list object equivalents). Let me know if you are referring to something else. For general context: the proposed new APIs (`PyDict_FetchItem`) return “new references”. The existing APIs (e.g., `PyDict_GetItem`) return “borrowed references.” The borrowed references are sometimes unsafe without the GIL, such as when another thread might concurrently modify the container.

The PEP does _not_ propose making the borrowed reference versions a compile error (nor does it deprecate them). This for a few reasons:

-   Many of the uses of `PyDict/List_GetItem` are safe even without the GIL. For example, accessing kwargs with PyDict\_GetItem is safe because the kwargs generally cannot be modified by another thread.
-   I tried this approach briefly early on, and, in my experience, wholesale replacing “borrowed references” with “new references” in existing code made it too easy to introduce new reference counting bugs.

I think the risk of introducing new reference counting bugs generally outweighs the risks of missing a PyDict/List\_GetItem call that’s unsafe without the GIL. That said, extension authors know their own code best, so if someone wants to replace `PyDict_GetItem` with `PyDict_FetchItem` they certainly can do so.

I’ll add this reasoning to the PEP.

![heart](https://emoji.discourse-cdn.com/apple/heart.png?v=15 "heart")

3

1 Reply

​

​

## post by colesbury on Jan 11, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/colesbury/48/28031_2.png)](https://discuss.python.org/u/colesbury)

[Sam Gross](https://discuss.python.org/u/colesbury) [colesbury](https://discuss.python.org/u/colesbury) [CPython core developer](https://discuss.python.org/g/committers)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/12 "Post date")

![](https://sea2.discourse-cdn.com/flex016/user_avatar/discuss.python.org/h-vetinari/48/1220_2.png) H. Vetinari:

[](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/6 "go to the quoted post")

> I’m surprised to see this diverge from existing efforts in the same direction. Is it impossible to make nogil work with PEP 683 semantics, should PEP 683 be modified, or what are the trade-offs (performance?) if PEP 683 were used as is?

PEP 683 tries to be compatible with the stable ABI (abi3) and makes some trade-offs to support that, such as putting the immortal bit as the 2nd highest bit. You could make this PEP look more like a bit more like PEP 683 (by placing the immortal bit in the same spot), but I think it would only be superficial similarity because this PEP depends on biased reference counting (there are two reference counting fields instead of one), so the overall reference counting scheme is going to be different regardless. On x86-64, using one of the low bits instead of the 2nd highest bit makes checking if an object is immortal a teeny bit faster. I don’t think PEP 683 should be changed – I think it’s a good solution given the constraints of ABI stability. I’ll wait a bit to see if there are more comments on immortalization and then try to summarize this in the PEP.

Regarding motivation: I’m hoping that people that use Python for the many other use cases not mentioned in the PEP can weigh in here about either the problems the GIL poses for them or with their concerns about this PEP. To the extent that there are common themes, I’ll try to capture them in the PEP.

Regarding the build modes: I [wrote](https://peps.python.org/pep-0703/#python-build-modes) this in the PEP, but my hope is for the two build modes to be temporary. I think having two build modes – for a short period – is worthwhile because it reduces the risks during integration into CPython and gives a bit more time for extensions to adapt. I don’t really see the build modes as a means for extension authors to “opt-out” of supporting it, although it’s possible it’s used that way. Like you, I think there will be pressure from users on extension authors to support it, and I think that pressure will be because the users see value in running without the GIL.

1 Reply

​

​

## post by colesbury on Jan 11, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/colesbury/48/28031_2.png)](https://discuss.python.org/u/colesbury)

[Sam Gross](https://discuss.python.org/u/colesbury) [colesbury](https://discuss.python.org/u/colesbury) [CPython core developer](https://discuss.python.org/g/committers)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/13 "Post date")

![](https://sea2.discourse-cdn.com/flex016/user_avatar/discuss.python.org/methane/48/43_2.png) Inada Naoki:

[](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/9 "go to the quoted post")

> I prefer `--enable-gil / --disable-gil` option.

I like `--enable-gil / --disable-gil` too. I’ll wait a bit to see if there are additional comments on the build option naming and then update the PEP.

![heart](https://emoji.discourse-cdn.com/apple/heart.png?v=15 "heart")

6

​

​

## post by petersuter on Jan 11, 2023

[![](https://avatars.discourse-cdn.com/v4/letter/p/13edae/48.png)](https://discuss.python.org/u/petersuter)

[Peter Suter](https://discuss.python.org/u/petersuter)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/14 "Post date")

What is the impact on packaging, wheel tags, PyPI, pip, python org installers etc.?

![heart](https://emoji.discourse-cdn.com/apple/heart.png?v=15 "heart")

2

​

​

## post by h-vetinari on Jan 11, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/h-vetinari/48/1220_2.png)](https://discuss.python.org/u/h-vetinari)

[H. Vetinari](https://discuss.python.org/u/h-vetinari)

1

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/15 "Post date")

Thanks for the response!

![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/colesbury/48/28031_2.png) Sam Gross:

[](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/12 "go to the quoted post")

> PEP 683 tries to be compatible with the stable ABI (abi3) and makes some trade-offs to support that, such as putting the immortal bit as the 2nd highest bit. \[…\] I don’t think PEP 683 should be changed – I think it’s a good solution given the constraints of ABI stability.

So if I’m reading this (and the PEP) correctly:

-   nogil needs _both_ biased & deferred reference counting (for thread safety resp. performance)
-   nogil needs a break of the stable ABI
-   it’s thus independent of PEP 683, but would replace(?) PEP 683’s changes in this space with its own

![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/colesbury/48/28031_2.png) Sam Gross:

[](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/12 "go to the quoted post")

> Regarding the build modes: I [wrote](https://peps.python.org/pep-0703/#python-build-modes) this in the PEP, but my hope is for the two build modes to be temporary. I think having two build modes – for a short period – is worthwhile because it reduces the risks during integration into CPython and gives a bit more time for extensions to adapt.

Not to nitpick, but the linked section says “These may be worthwhile if a longer term goal is to have a single build mode”, which is… at odds… with “for a short period”. BTW, this choice is a really hard problem, and it’s fine that the PEP doesn’t really commit to a timeline, but IMO those trade-offs (additional build mode – what would that imply over short/long term? – or new default) could use some more discussion.

![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/colesbury/48/28031_2.png) Sam Gross:

[](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/12 "go to the quoted post")

> I don’t really see the build modes as a means for extension authors to “opt-out” of supporting it, although it’s possible it’s used that way. Like you, I think there will be pressure from users on extension authors to support it, and I think that pressure will be because the users see value in running without the GIL.

I absolutely see libraries opting out of this, at least for a while (e.g. “making our library threadsafe needs a large overhaul of core component X, and we’ll do it in the next Y months”), which will create a situation where people want to install a given library on the nogil ABI, only to find out that it doesn’t exist (or worse: since there are no nogil-wheels, it falls back to trying to install from source) – would pip even be able to take the python ABI flavour into account for the resolver, resp. give a reasonable error?

It’s also going to create confusion for users who have no idea what an ABI is, when a library advertises itself as “we support Python 3.12 (but not nogil)”, and then users need to understand that distinction.

The least painful scenario I could imagine (very subjective, obviously) is to redeclare Python 3.13 as 4.0, no additional build mode but with changed ABI, merge nogil immediately after branching 3.12 (and publish an alpha right after), then work with the extension ecosystem over the following year to get as far as possible in getting the most used libraries “4.0/nogil-ready”. I know you have some experience with that already with the libraries you patched for the existing nogil fork, but it’s gonna take a while for the ecosystem to digest such a change IMO (whether with a separate build mode or not ).

---

1.  that in and of itself probably makes it “Python 4.0” material? [↩︎](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606#footnote-ref-80783-1)

2.  I just think a changed default will cause less friction overall, rather than subjecting the library maintainers (as well as tooling & infrastructure) to having to deal with both modes + users who can’t wait for nogil either way. [↩︎](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606#footnote-ref-80783-2)

![heart](https://emoji.discourse-cdn.com/apple/heart.png?v=15 "heart")

9

1 Reply

​

​

-   [PEP 703: Making the Global Interpreter Lock Optional (3.12 updates)](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional-3-12-updates/26503/102)

## post by encukou on Jan 11, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/encukou/48/2461_2.png)](https://discuss.python.org/u/encukou)

[Petr Viktorin](https://discuss.python.org/u/encukou) [encukou](https://discuss.python.org/u/encukou) [CPython core developer](https://discuss.python.org/g/committers)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/16 "Post date")

This would place a huge burden on authors of third-party C-API extensions. I don’t see how we could have nogil without a situation similar to the Python 2→3 transition – two incompatible versions of Python existing in parallel for a long time.

![heart](https://emoji.discourse-cdn.com/apple/heart.png?v=15 "heart")

10

2 Replies

​

​

## post by ashbt on Jan 11, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/ashbt/48/10580_2.png)](https://discuss.python.org/u/ashbt)

[Ash Berlin-Taylor](https://discuss.python.org/u/ashbt) [ashbt](https://discuss.python.org/u/ashbt)

2

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/17 "Post date")

In [CPython Free Lists](https://peps.python.org/pep-0703/#cpython-free-lists) you mention that freelists will be disabled when building without the GIL – is there a reason to not have a pre-thread freelist instead?

Oh, because allocations are global, and a pre thread list just doesn’t really make sense. Sorry, I haven’t had enough coffee yet ![:slight\_smile:](https://emoji.discourse-cdn.com/apple/slight_smile.png?v=12 ":slight_smile:")

1 Reply

​

​

## post by ashbt on Jan 11, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/ashbt/48/10580_2.png)](https://discuss.python.org/u/ashbt)

[Ash Berlin-Taylor](https://discuss.python.org/u/ashbt) [ashbt](https://discuss.python.org/u/ashbt)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/18 "Post date")

![](https://sea2.discourse-cdn.com/flex016/user_avatar/discuss.python.org/jeanas/48/8115_2.png) Jean Abou Samra:

[](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/8 "go to the quoted post")

> Minor note: perhaps the PEP should say what happens to the `generation` argument of
> [gc.collect](https://docs.python.org/3/library/gc.html#gc.collect) .

In [Garbage Collection (Cycle Collection)](https://peps.python.org/pep-0703/#garbage-collection-cycle-collection) it says

> -   Elimination of generational garbage collection in favor of non-generational collector.

1 Reply

​

​

## post by mattip on Jan 11, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/mattip/48/330_2.png)](https://discuss.python.org/u/mattip)

[Matti Picus](https://discuss.python.org/u/mattip) [mattip](https://discuss.python.org/u/mattip)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/19 "Post date")

![](https://sea2.discourse-cdn.com/flex016/user_avatar/discuss.python.org/h-vetinari/48/1220_2.png) H. Vetinari:

[](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/15 "go to the quoted post")

> it falls back to trying to install from source)

There [is a proposal](https://github.com/pypa/pip/issues/9140) to change this. Maybe there should be an explicit section of the PEP to discuss implications for c-extension library authors.

In any case, the Distribution section should be extended to describe what resources lie behind the statement below. Has this been discussed with Anaconda (maybe the author means “the conda-forge community”, which maintains the cutting-edge versions of packages like NumPy)? Will the conda package be a fork of the upstream package or does it depend on the package maintainers to do the work?

> the author will work with Anaconda to distribute a `--without-gil` version of Python".

![heart](https://emoji.discourse-cdn.com/apple/heart.png?v=15 "heart")

2

1 Reply

​

​

## post by ashbt on Jan 11, 2023

[![](https://sea2.discourse-cdn.com/flex002/user_avatar/discuss.python.org/ashbt/48/10580_2.png)](https://discuss.python.org/u/ashbt)

[Ash Berlin-Taylor](https://discuss.python.org/u/ashbt) [ashbt](https://discuss.python.org/u/ashbt)

[Jan 2023](https://discuss.python.org/t/pep-703-making-the-global-interpreter-lock-optional/22606/20 "Post date")

Somewhat relatedly, this came up in my feed today about a similar issue in bind [Safe memory reclamation for BIND – Tony Finch](https://dotat.at/@/2023-01-10-qsbr.html) and it talks about [https://liburcu.org/](https://liburcu.org/) (which is LGPL’d, so I suspect not of use to Python core.)

​

​

## Load more posts below
