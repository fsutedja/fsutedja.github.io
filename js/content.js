/*
  ✿ THIS IS THE FILE YOU EDIT ✿

  Everything written on the site lives here. Change the text between the quotes,
  save, and refresh the browser.

  To add another project / place / skill: copy an existing { ... } block (or "..." line),
  paste it right after, and edit it. Keep the commas between items.
*/

// ---------- The intro card ----------
const intro = {
  greeting: "hi, i'm freya",
  tagline: "applied math (data science) @ uc berkeley",
  links: [
    { label: "résumé", url: "resume.pdf" },         // put resume.pdf in the main folder
    { label: "linkedin", url: "https://www.linkedin.com/in/freyaas/" },
    { label: "github", url: "https://github.com/fsutedja" },
    { label: "email", url: "mailto:freyas@berkeley.edu" }, // keep "mailto:" in front of the email
  ],
};

// ---------- Projects: each one becomes a card on the water ----------
//   status: "done" or "in progress"
//   gem:    optional. "pink", "aqua", "pearl" or "pinkround"
const projects = [
  {
    title: "A Kaggle notebook",
    status: "done",
    what: "Placeholder. What it is, in one sentence.",
    why: "What made you curious about it.",
    tools: "Python, pandas, scikit-learn",
    links: [
      { label: "notebook", url: "#" },
      { label: "github", url: "#" },
    ],
    gem: "aqua",
  },
  {
    title: "A small build",
    status: "done",
    what: "Placeholder. Something you made.",
    why: "The problem it solves.",
    tools: "Python",
    links: [{ label: "github", url: "#" }],
  },
  {
    title: "What's next",
    status: "in progress",
    what: "Placeholder. What you're building right now.",
    gem: "pink",
  },
];

// ---------- What I can do / what I'm learning ----------
const skills = {
  canDo: ["Python", "pandas", "Kaggle notebooks", "add yours"],
  learning: ["add what you're learning now"],
  taughtMyself: ["calculus", "probability", "statistics", "combinatorics"],
};

// ---------- Places I've visited (the map in "life", also opened by the paper boat) ----------
// Each place becomes a dot on the map. The counts and continent list update by themselves.
// lat / lon: search "<city> coordinates" on Google, it shows e.g. 37.87° N, 122.27° W.
//            North and East are positive numbers, South and West are negative.
// note: optional, one short line.
const places = [
  { city: "Berkeley", country: "United States", continent: "North America", lat: 37.87, lon: -122.27, note: "new here. still finding my walks." },
  { city: "Example: Tokyo", country: "Japan", continent: "Asia", lat: 35.68, lon: 139.69, note: "placeholder, replace me" },
  { city: "Example: Paris", country: "France", continent: "Europe", lat: 48.86, lon: 2.35, note: "placeholder, replace me" },
];

// ---------- Life: the other tiles next to the map ----------
const life = {
  walks: { song: "Song title", artist: "Artist" },   // what's on repeat on your walks
  reading: { book: "Book title", author: "Author" }, // what you're reading now
};
