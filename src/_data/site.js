// Site-wide metadata.
// url er den KANONISKE host i punycode-form og bruges til canonical, og:url,
// JSON-LD, robots.txt og sitemap, så alle signaler peger på samme host-form.
// displayUrl er den læsbare form til tekst (i-stødet.dk).
export default {
  name: "I stødet",
  url: "https://xn--i-stdet-t1a.dk",
  displayUrl: "https://i-stødet.dk",
  tagline: "Se hvornår strømmen er billig, og spar på det du alligevel bruger",
  description: "Se de danske elpriser i dag og i morgen, og spar ved at flytte forbruget til de billige timer.",
  maker: "alfanova",
  makerUrl: "https://alfanova.dk",
  appPath: "/app/",
  ogImage: "/assets/img/og-image.png",
  ogImageAlt: "I stødet. Se hvornår strømmen er billig, og spar på det du alligevel bruger.",
  nav: [
    { href: "/spar/", label: "Sådan sparer du" },
    { href: "/saadan-beregner-vi/", label: "Sådan beregner vi" },
    { href: "/om/", label: "Om" },
    { href: "/app/", label: "Åbn app", cta: true },
  ],
};
