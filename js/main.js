/* MERIDIAN – scroll-beleving van 11:59 naar 12:00
   GSAP + ScrollTrigger voor pin/scrub, Lenis voor zachte scroll. */

(() => {
  const html = document.documentElement;
  const rustig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fijnePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const heeftGsap = window.gsap && window.ScrollTrigger;
  if (rustig || !heeftGsap) html.classList.add("rustig");

  /* ---------- Klok: 11:59:00 → 12:00:00 ---------- */
  const klok = $(".klok");
  const klokTijd = $(".klok__tijd");
  const klokSec = $(".klok__sec");
  function zetKlok(p) {
    const sec = Math.min(60, Math.round(p * 60));
    if (sec >= 60) {
      klokTijd.textContent = "12:00";
      klokSec.textContent = ":00";
      klok.classList.add("is-middag");
    } else {
      klokTijd.textContent = "11:59";
      klokSec.textContent = ":" + String(sec).padStart(2, "0");
      klok.classList.remove("is-middag");
    }
  }

  /* ---------- Formulier (MailerLite "Meridian – Nieuwsbrief") ---------- */
  const form = $(".formulier");
  const melding = $(".formulier__melding");
  const bedankt = $(".bedankt");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const naam = $("#f-naam"), mail = $("#f-mail"), optin = $("#f-optin");
    const fouten = [];
    [naam, mail].forEach((i) => i.removeAttribute("aria-invalid"));
    if (!naam.value.trim()) { fouten.push("je voornaam"); naam.setAttribute("aria-invalid", "true"); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.value.trim())) { fouten.push("een geldig e-mailadres"); mail.setAttribute("aria-invalid", "true"); }
    if (!optin.checked) fouten.push("je toestemming");
    if (fouten.length) {
      melding.textContent = "Vul nog " + fouten.join(", ").replace(/, ([^,]*)$/, " en $1") + " in.";
      (form.querySelector('[aria-invalid="true"]') || optin).focus();
      return;
    }
    const knop = form.querySelector("button");
    knop.disabled = true;
    melding.textContent = "Even inchecken…";
    try {
      const res = await fetch(form.action, { method: "POST", body: new FormData(form) });
      const data = await res.json();
      if (!data.success) throw new Error("mislukt");
      form.hidden = true;
      bedankt.hidden = false;
      bedankt.focus();
    } catch (err) {
      melding.textContent = "Dat lukte niet. Probeer het zo meteen opnieuw.";
      knop.disabled = false;
    }
  });

  /* ---------- Video's: pas laden als ze in de buurt komen ---------- */
  const hoog = () => matchMedia("(max-aspect-ratio: 1/1)").matches;
  function laadVideo(v) {
    if (v.dataset.geladen) return;
    v.dataset.geladen = "1";
    if (hoog() && v.dataset.posterHoog) v.poster = v.dataset.posterHoog;
    v.src = hoog() ? v.dataset.srcHoog : v.dataset.srcBreed;
    v.load();
  }
  const videoKijker = new IntersectionObserver((items) => {
    items.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting) {
        laadVideo(v);
        if (!rustig) v.play().catch(() => {});
      } else if (!v.paused) v.pause();
    });
  }, { rootMargin: "200px 0px" });
  $$("video").forEach((v) => videoKijker.observe(v));

  const geluid = $(".film__geluid");
  geluid.addEventListener("click", () => {
    const v = $(".film__video");
    laadVideo(v);
    v.muted = !v.muted;
    if (!v.muted) v.play().catch(() => {});
    geluid.setAttribute("aria-pressed", String(!v.muted));
    $(".film__geluid-tekst", geluid).textContent = v.muted ? "Geluid aan" : "Geluid uit";
  });

  /* ---------- Zonder GSAP of met minder beweging: alles statisch ---------- */
  if (!heeftGsap || rustig) {
    html.classList.add("is-geladen");
    const update = () => {
      const doel = $("#inschrijven").offsetTop - innerHeight * 0.4;
      zetKlok(Math.max(0, Math.min(1, scrollY / doel)));
    };
    addEventListener("scroll", update, { passive: true });
    update();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.set(document.body, { "--fg": "#2A1B21", "--bgc": "#FBF3E4" });

  /* ---------- Lenis: zachte scroll ---------- */
  const lenis = new Lenis({ lerp: 0.14, smoothWheel: true, wheelMultiplier: 1.1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const doel = $(a.getAttribute("href"));
      if (!doel) return;
      e.preventDefault();
      lenis.scrollTo(doel, { offset: 0, duration: 2.2 });
    })
  );

  /* ---------- Woorden splitsen voor de onthulling ---------- */
  $$(".splits, .splits-regels").forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/)
      .map((w) => `<span class="woord">${w}</span>`).join(" ");
  });

  /* ---------- 0. Intro: 11:59 → 12:00, lichtflits, dan de hero ---------- */
  lenis.stop();
  scrollTo(0, 0);
  gsap.set(".hero__in", { opacity: 0, y: 34 });
  gsap.set(".hero__boog", { clipPath: "inset(100% 0% 0% 0% round 999px 999px 18px 18px)" });
  gsap.set(".hero__boog img", { scale: 1.18 });
  gsap.set(".miniticket", { opacity: 0, x: -40, rotation: -6 });
  gsap.set([".scrollhint", ".kop"], { opacity: 0, y: 16 });

  const intro = gsap.timeline({
    defaults: { ease: "power3.out" },
    onComplete: () => { html.classList.add("is-geladen"); lenis.start(); },
  });
  intro
    .to(".intro__klok", { opacity: 1, duration: 0.2 })
    .to([".intro__uur", ".intro__min"], { yPercent: -60, opacity: 0, duration: 0.18, ease: "power2.in" }, 0.45)
    .add(() => { $(".intro__uur").textContent = "12"; $(".intro__min").textContent = "00"; })
    .fromTo([".intro__uur", ".intro__min"], { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.22 })
    .to(".intro__klok", { color: "#F2BE5C", duration: 0.2 }, "<")
    .to(".intro__flits", { scale: 4, opacity: 1, duration: 0.45, ease: "power2.in" }, 0.95)
    .to(".intro", { opacity: 0, duration: 0.5, ease: "power1.out" }, 1.35)
    .to(".hero__in", { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, 1.4)
    .to(".hero__boog", { clipPath: "inset(0% 0% 0% 0% round 999px 999px 18px 18px)", duration: 1.2, ease: "power3.inOut" }, 1.35)
    .to(".hero__boog img", { scale: 1, duration: 1.6 }, 1.35)
    .to(".miniticket", { opacity: 1, x: 0, rotation: -3, duration: 1 }, 1.9)
    .from(".miniticket .stempel", { scale: 2.4, opacity: 0, rotation: -60, duration: 0.5, ease: "back.out(2.2)" }, 2.3)
    .to([".scrollhint", ".kop"], { opacity: 1, y: 0, duration: 0.8 }, 1.7);

  /* ---------- Desktop en mobiel apart ---------- */
  const mm = gsap.matchMedia();
  mm.add({ desktop: "(min-width: 821px)", mobiel: "(max-width: 820px)" }, (ctx) => {
    const { desktop } = ctx.conditions;

    // Hero: foto schuift trager dan de pagina, ticket zweeft mee
    gsap.to(".hero__boog img", { yPercent: -10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".miniticket", { y: desktop ? -90 : -30, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    if (desktop) gsap.to(".hero__tekst", { y: -60, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "center top+=30%", end: "bottom top", scrub: true } });

    // Middaglicht: fotokaarten met parallax
    gsap.fromTo(".fotokaart--groot", { y: 80, rotation: 5 }, { y: -60, rotation: 2, ease: "none", scrollTrigger: { trigger: ".middaglicht", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.fromTo(".fotokaart--klein", { y: 160, rotation: -8 }, { y: -40, rotation: -3, ease: "none", scrollTrigger: { trigger: ".middaglicht", start: "top bottom", end: "bottom top", scrub: true } });

    // Geurnoten: kaarten komen binnen, beeld beweegt in de kaart
    $$(".notekaart").forEach((kaart, i) => {
      gsap.from(kaart, { y: 90, opacity: 0, duration: 1.1, ease: "power3.out", delay: desktop ? i * 0.12 : 0,
        scrollTrigger: { trigger: desktop ? ".noten__rij" : kaart, start: "top 85%", toggleActions: "play none none reverse" } });
      gsap.fromTo($(".notekaart__beeld img", kaart), { yPercent: -12 }, { yPercent: 0, ease: "none",
        scrollTrigger: { trigger: kaart, start: "top bottom", end: "bottom top", scrub: true } });
    });

    // Waar je ook landt: horizontaal scrollen (desktop)
    if (desktop) {
      const spoor = $(".baan__spoor");
      const afstand = () => spoor.scrollWidth - innerWidth;
      const hor = gsap.to(spoor, {
        x: () => -afstand(), ease: "none",
        scrollTrigger: { trigger: ".bestemmingen", start: "top top", end: () => "+=" + afstand(), pin: true, scrub: 0.6, invalidateOnRefresh: true },
      });
      $$(".pas").forEach((pas) => {
        gsap.from($(".stempel", pas), {
          scale: 2.6, opacity: 0, rotation: -60, duration: 0.55, ease: "back.out(2.2)",
          scrollTrigger: { trigger: pas, containerAnimation: hor, start: "left 62%", toggleActions: "play none none reverse" },
        });
        gsap.from($(".pas__beeld", pas), {
          scale: 1.2, ease: "none",
          scrollTrigger: { trigger: pas, containerAnimation: hor, start: "left right", end: "right left", scrub: true },
        });
      });
    } else {
      gsap.from(".stempel", {
        scale: 2.4, opacity: 0, rotation: -60, duration: 0.55, stagger: 0.15, ease: "back.out(2.2)",
        scrollTrigger: { trigger: ".baan", start: "top 70%" },
      });
    }

    // Film groeit van klein naar schermvullend
    const filmTl = gsap.timeline({
      scrollTrigger: { trigger: ".film", start: "top top", end: desktop ? "+=90%" : "+=70%", pin: true, scrub: 0.6 },
    });
    filmTl
      .fromTo(".film__kader",
        { clipPath: desktop ? "inset(28% 30% 28% 30% round 24px)" : "inset(18% 12% 18% 12% round 20px)" },
        { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "power2.inOut", duration: 1 })
      .from(".film__tekst > *", { opacity: 0, y: 40, stagger: 0.1, duration: 0.4 }, 0.6);

    // Cadeau
    gsap.from(".cadeau__boog", { y: 80, opacity: 0, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: ".cadeau", start: "top 65%" } });
    gsap.fromTo(".cadeau__los", { y: 120 }, { y: -60, ease: "none", scrollTrigger: { trigger: ".cadeau", start: "top bottom", end: "bottom top", scrub: true } });

    // Inschrijven: de zon zakt precies boven de dop, 12:00
    const twaalf = gsap.timeline({ scrollTrigger: { trigger: ".inschrijven", start: "top 70%", end: "top 15%", scrub: 0.6 } });
    twaalf
      .fromTo(".twaalf__zon", { y: -140, opacity: 0, scale: 0.6 }, { y: 0, opacity: 1, scale: 1, ease: "power2.out" })
      .fromTo(".twaalf__lijn", { scaleY: 0 }, { scaleY: 1, ease: "none" }, "-=0.3")
      .fromTo(".twaalf__tijd", { opacity: 0, y: 20 }, { opacity: 1, y: 0 }, "-=0.2");
    gsap.from(".twaalf__fles", { y: 80, opacity: 0, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: ".inschrijven", start: "top 75%" } });
  });

  /* ---------- Woord-per-woord onthullen ---------- */
  $$(".splits, .splits-regels").forEach((el) => {
    gsap.fromTo($$(".woord", el), { opacity: 0.15, y: "0.25em" }, {
      opacity: 1, y: 0, stagger: 0.08, ease: "none",
      scrollTrigger: { trigger: el, start: "top 88%", end: "top 50%", scrub: true },
    });
  });

  /* Na de pins aanmaken, zodat de posities de pin-ruimte meetellen */
  /* ---------- Kleur per hoofdstuk ---------- */
  $$("[data-bg]").forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: (self) => {
        if (!self.isActive) return;
        gsap.to(".achtergrond", { backgroundColor: sec.dataset.bg, duration: 1.1, ease: "power2.out", overwrite: true });
        gsap.to(document.body, { "--fg": sec.dataset.fg, "--bgc": sec.dataset.bg, duration: 1.1, ease: "power2.out", overwrite: true });
      },
    });
  });

  /* ---------- Klok + meridiaanlijn ---------- */
  ScrollTrigger.create({
    start: 0,
    endTrigger: "#inschrijven",
    end: "top 40%",
    onUpdate: (self) => zetKlok(self.progress),
  });
  gsap.to(".meridiaan__lijn", {
    scaleY: 1, ease: "none",
    scrollTrigger: { start: 0, end: "max", scrub: 0.6 },
  });

  /* ---------- Desktop-extra's: cursor en magnetische knoppen ---------- */
  if (fijnePointer) {
    html.classList.add("heeft-cursor");
    const cursor = $(".cursor");
    const cx = gsap.quickTo(cursor, "x", { duration: 0.25, ease: "power3" });
    const cy = gsap.quickTo(cursor, "y", { duration: 0.25, ease: "power3" });
    addEventListener("pointermove", (e) => {
      cx(e.clientX); cy(e.clientY);
    });
    $$("a, button, label, input").forEach((el) => {
      el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
    });
    $$(".magneet").forEach((el) => {
      const mx = gsap.quickTo(el, "x", { duration: 0.5, ease: "elastic.out(1, .4)" });
      const my = gsap.quickTo(el, "y", { duration: 0.5, ease: "elastic.out(1, .4)" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.3);
        my((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener("pointerleave", () => { mx(0); my(0); });
    });
  }

  addEventListener("load", () => ScrollTrigger.refresh());
})();
