/**
 * Report copy. Soft Autumn is the approved canvas report (project/Report.dc.html on
 * https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3); the other 11 seasons and the four
 * agreement notes were approved on https://claude.ai/artifact/TDo1Ca824cof8DpfkFMdLz (2026-10-03).
 *
 * @see openspec/specs/report-text/spec.md
 */
import type { Agreement } from "../classifier/index.ts";
import type { SeasonSlug } from "../palettes/seasons.ts";
import type { AgreementCopy, SeasonCopy } from "./index.ts";

export const SEASON_COPY: Record<SeasonSlug, SeasonCopy> = {
  "light-spring": {
    tagline: "Warm, light and fresh.",
    summary:
      "Light Spring is the lightest of the three Springs. Your coloring is warm and delicate, with light hair, skin and eyes and gentle contrast between them. Clear colors with a sunny base and plenty of white in them brighten you. Dark, heavy and dusty colors weigh you down.",
    undertone: "Warm, leaning neutral",
    chroma: "Clear and light, never muddy",
    contrast: "Low to medium",
    neutralsIntro: "Swap black and charcoal for these. Ivory and soft navy carry a whole outfit.",
    metalsIntro: "Light and golden beats dark and oxidized.",
    makeupIntro: "Keep it light and warm: peach, coral and soft pink.",
    hairTip:
      "Stay light and golden: honey or strawberry blonde. Skip ash tones and anything near black.",
    drapingLine: "Peach lights up your skin; burgundy weighs it down.",
  },
  "true-spring": {
    tagline: "Warm, clear and golden.",
    summary:
      "True Spring is the warmest of the three Springs. Your coloring is golden through and through, with medium depth and lively contrast. Clear, warm colors like coral, golden yellow and warm teal make you glow. Cool, dusty and icy colors drain you.",
    undertone: "Warm",
    chroma: "Clear: bright and fresh",
    contrast: "Medium",
    neutralsIntro: "Swap black and grey for these warm browns and navy. They carry a whole outfit.",
    metalsIntro: "Polished gold, brass and copper beat silver.",
    makeupIntro: "Stay warm and fresh: coral, peach and tomato red.",
    hairTip: "Warm it up: golden, copper or chestnut. Skip ash shades and blue-black.",
    drapingLine: "Coral brings your skin to life; burgundy dulls it.",
  },
  "bright-spring": {
    tagline: "Warm, bright and vivid.",
    summary:
      "Bright Spring is the clearest of the three Springs. Your coloring is warm with high contrast, often bright eyes against darker hair. Saturated, clear colors with a warm lean match your intensity. Dusty, muted and greyed colors make you look tired.",
    undertone: "Warm, leaning neutral",
    chroma: "Bright: clear and saturated",
    contrast: "High",
    neutralsIntro:
      "Swap black for ink navy and chocolate, and stark white for bright ivory. They carry a whole outfit.",
    metalsIntro: "Polished and shiny beats antique and matte.",
    makeupIntro: "Go clear and bright: coral, warm pink and warm red.",
    hairTip:
      "Keep depth and shine: chestnut, copper or warm dark brown. Skip ashy and greyed shades.",
    drapingLine: "Bright coral matches your clarity; olive drab dulls it.",
  },
  "light-summer": {
    tagline: "Cool, light and airy.",
    summary:
      "Light Summer is the lightest of the three Summers. Your coloring is cool and delicate, with light hair, skin and eyes and gentle contrast. Soft pastels with a cool, rosy base flatter you. Dark, heavy and warm earthy colors overpower you.",
    undertone: "Cool, leaning neutral",
    chroma: "Soft and light, never neon",
    contrast: "Low",
    neutralsIntro:
      "Swap black and camel for soft white, grey and soft navy. They carry a whole outfit.",
    metalsIntro: "Silver, platinum and white gold beat yellow gold.",
    makeupIntro: "Keep it cool and soft: rose, berry and watermelon pink.",
    hairTip:
      "Stay light and cool: ash blonde or light ash brown. Skip golden, copper and very dark shades.",
    drapingLine: "Powder blue softens your skin; mustard turns it sallow.",
  },
  "true-summer": {
    tagline: "Cool, soft and serene.",
    summary:
      "True Summer is the coolest of the three Summers. Your coloring has a clear pink or blue undertone, medium depth and soft contrast. Cool colors with a touch of grey, like rose, slate blue and raspberry, look effortless on you. Orange, gold and warm browns clash.",
    undertone: "Cool",
    chroma: "Soft to medium, never neon",
    contrast: "Low to medium",
    neutralsIntro:
      "Swap black and camel for navy, charcoal blue and cool grey. They carry a whole outfit.",
    metalsIntro: "Silver, platinum and pewter beat yellow gold.",
    makeupIntro: "Stay cool and rosy: rose, raspberry and berry pink.",
    hairTip: "Stay cool: ash brown or ash blonde. Skip golden highlights and copper.",
    drapingLine: "Soft blue calms your skin; orange fights it.",
  },
  "soft-summer": {
    tagline: "Cool, muted and smoky.",
    summary:
      "Soft Summer is the most muted of the three Summers. Your coloring is cool to neutral, with medium depth and low contrast. Greyed, dusty colors like dusty rose, slate and smoky plum blend with you. Bright, saturated and warm colors overpower you.",
    undertone: "Cool, leaning neutral",
    chroma: "Soft: muted and dusty",
    contrast: "Low",
    neutralsIntro:
      "Swap black and stark white for charcoal, grey navy and soft white. They carry a whole outfit.",
    metalsIntro: "Brushed silver, pewter and rose gold beat polished gold and copper.",
    makeupIntro: "Stay in the same cool, dusty family as your clothes.",
    hairTip: "Stay soft and cool: ash brown or cool mocha. Skip brassy gold and blue-black.",
    drapingLine: "Dusty rose blends with your skin; orange competes with it.",
  },
  "soft-autumn": {
    tagline: "Warm, soft and earthy.",
    summary:
      "Soft Autumn is the gentlest of the three Autumns. Your coloring is warm and muted, with medium depth and low contrast between your hair, skin and eyes. Colors with a golden base and a little dust in them blend with you. Bright, icy and very dark colors compete.",
    undertone: "Warm, leaning neutral",
    chroma: "Soft: muted, never neon",
    contrast: "Low to medium",
    neutralsIntro: "Swap black and stark white for these. They carry a whole outfit.",
    metalsIntro: "Brushed and warm beats bright and cool.",
    makeupIntro: "Stay in the same warm, muted family as your clothes.",
    hairTip: "Go one or two shades warmer than your natural color. Skip ash blonde and blue-black.",
    drapingLine: "Terracotta warms your skin; fuchsia competes with it.",
  },
  "true-autumn": {
    tagline: "Warm, rich and golden.",
    summary:
      "True Autumn is the warmest of the three Autumns. Your coloring is golden and earthy, with medium depth and medium contrast. Rich, warm colors like pumpkin, olive and bronze glow on you. Cool, icy and pink-based colors drain you.",
    undertone: "Warm",
    chroma: "Medium: rich, never neon",
    contrast: "Medium",
    neutralsIntro: "Swap black and grey for camel, olive and chocolate. They carry a whole outfit.",
    metalsIntro: "Gold, copper and bronze beat silver.",
    makeupIntro: "Stay warm and earthy: brick, terracotta and burnt coral.",
    hairTip: "Go warm and rich: auburn, copper or golden chestnut. Skip ash tones and blue-black.",
    drapingLine: "Pumpkin warms your skin; bubblegum pink fights it.",
  },
  "deep-autumn": {
    tagline: "Warm, deep and rich.",
    summary:
      "Deep Autumn is the darkest of the three Autumns. Your coloring is warm and deep, with dark hair or eyes and medium to high contrast. Dark, warm colors like deep rust, forest olive and chocolate match your depth. Pastels and icy colors wash you out.",
    undertone: "Warm, leaning neutral",
    chroma: "Rich: deep and warm",
    contrast: "Medium to high",
    neutralsIntro:
      "Swap black for espresso and chocolate, and stark white for cream. They carry a whole outfit.",
    metalsIntro: "Antique gold, bronze and copper beat polished silver.",
    makeupIntro: "Go deep and warm: brick, terracotta and chocolate berry.",
    hairTip:
      "Keep it deep and warm: dark chocolate, mahogany or deep auburn. Skip pale blonde and ash.",
    drapingLine: "Deep rust matches your depth; pastel pink washes you out.",
  },
  "deep-winter": {
    tagline: "Cool, deep and striking.",
    summary:
      "Deep Winter is the darkest of the three Winters. Your coloring is cool to neutral and deep, with dark hair and eyes and high contrast. Dark, saturated colors and true black match your depth. Warm, golden and earthy colors make you look tired.",
    undertone: "Cool, leaning neutral",
    chroma: "Clear: deep and saturated",
    contrast: "High",
    neutralsIntro:
      "Black and pure white are yours. Charcoal and dark navy carry an outfit just as well.",
    metalsIntro: "Silver, platinum and gunmetal beat yellow gold.",
    makeupIntro: "Go deep and cool: true red, deep berry and wine.",
    hairTip: "Stay dark and cool: espresso or soft black. Skip golden highlights and copper.",
    drapingLine: "True red matches your contrast; mustard turns your skin sallow.",
  },
  "true-winter": {
    tagline: "Cool, crisp and bold.",
    summary:
      "True Winter is the coolest of the three Winters. Your coloring has a cool blue or pink undertone and high contrast between your hair, skin and eyes. Clear, bold colors like blue red, fuchsia and navy look striking on you. Warm, golden and earthy colors clash.",
    undertone: "Cool",
    chroma: "Clear: bold and cool",
    contrast: "High",
    neutralsIntro:
      "Black and pure white are yours. Navy, charcoal and cool grey carry an outfit too.",
    metalsIntro: "Silver, platinum and white gold beat yellow gold.",
    makeupIntro: "Go bold and cool: blue red, cool fuchsia and berry wine.",
    hairTip:
      "Stay cool and dark: cool brown, soft black or blue-black. Skip golden, copper and caramel.",
    drapingLine: "Blue red sharpens your features; camel drains your skin.",
  },
  "bright-winter": {
    tagline: "Cool, bright and electric.",
    summary:
      "Bright Winter is the clearest of the three Winters. Your coloring is cool to neutral, with very high contrast, often bright eyes against dark hair. Vivid, saturated colors like hot pink, clear red and bright navy match your intensity. Dusty, muted and earthy colors dull you.",
    undertone: "Cool, leaning neutral",
    chroma: "Bright: vivid and clear",
    contrast: "Very high",
    neutralsIntro: "Black and pure white are yours. Ink navy and charcoal carry an outfit too.",
    metalsIntro: "Polished silver, platinum and chrome beat antique gold.",
    makeupIntro: "Go clear and vivid: clear red, hot fuchsia and bright berry.",
    hairTip:
      "Keep it dark and cool: soft black or cool espresso. Skip ashy, faded and golden shades.",
    drapingLine: "Hot pink matches your brightness; mushroom dulls it.",
  },
};

export const AGREEMENT_COPY: Record<Agreement, AgreementCopy> = {
  agree: {
    title: "Photo and quiz agree",
    body: "Your photo and your quiz answers point to the same season, so this result rests on both.",
  },
  differ: {
    title: "Photo and quiz differ",
    body: "Your photo and your quiz answers point different ways on warmth. The photo counts for more, so your result follows what the camera saw.",
  },
  "photo-only": {
    title: "Based on your photo",
    body: "You skipped the quiz, so this result comes from your photo alone: the coloring of your skin, hair and eyes.",
  },
  "quiz-only": {
    title: "Based on your answers",
    body: "Without a photo, this result comes from your quiz answers alone. A selfie in daylight would make it more precise.",
  },
};
