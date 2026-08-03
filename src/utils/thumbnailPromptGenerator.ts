/**
 * Compiles a highly detailed visual prompt package and graphic design layout spec sheet
 * suitable for both AI image generators (like Midjourney, DALL-E) and professional graphic designers.
 */
export const generateThumbnailSpecs = (
  theme: "magenta" | "emerald" | "cyan" | "gold",
  layout: "thirds" | "split",
  face: "shocked" | "distressed" | "confident",
  headline: string,
  leftMetric: string,
  leftSub: string,
  rightMetric: string,
  rightSub: string
): string => {
  // Mapping theme to descriptive palettes
  const themeDetails = {
    magenta: {
      name: "Neon Purple & Fuchsia Cyberwave",
      colorDescription: "vivid magenta neon, electric violet bars, and dense dark purple/lavender glow overlays",
      glowColors: "glowing neon fuchsia (#d946ef) and ultraviolet synthwave purple",
      ambientAura: "An ultra-modern high-contrast backdrop washed with glowing neon magenta side-glow and futuristic ultraviolet flares"
    },
    emerald: {
      name: "Cyber Green & Radiant Mint Matrix",
      colorDescription: "cyber green backing lights, emerald neon lines, and radioactive lime fluorescent glows",
      glowColors: "matrix cyber green (#10b981), glowing emerald mint, and high-frequency neon lime key-lights",
      ambientAura: "A high-tech cyberpunk hacking den illuminated with laser-sharp green terminal line pulses and intensive emerald contrast shadows"
    },
    cyan: {
      name: "Deep Ocean & Aqua Blizzard",
      colorDescription: "ice-cool cyan electric gradients, sapphire aqua light-sources, and polished marine spotlight beams",
      glowColors: "electric cyan blue (#06b6d4), deep turquoise glow, and marine-aqua rim lighting",
      ambientAura: "An energetic tech research facility styled with sharp cybernetic cyan arrays and oceanic aqua gradient flares"
    },
    gold: {
      name: "Solar Flame & Amber High-Energy Halo",
      colorDescription: "shimmering molten amber flares, burning golden fire halos, and hyper-vibrant solar highlights",
      glowColors: "solar flame amber (#f59e0b), majestic gold-veined backlighting, and blazing warm yellow studio light",
      ambientAura: "An opulent and high-power elite environment radiating majestic amber energy, golden particles, and warm golden rim illumination"
    }
  }[theme] || {
    name: "Cyber Green & Radiant Mint Matrix",
    colorDescription: "cyber green backing lights, emerald neon lines, and radioactive lime fluorescent glows",
    glowColors: "matrix cyber green (#10b981), glowing emerald mint, and high-frequency neon lime key-lights",
    ambientAura: "A high-tech cyberpunk hacking den illuminated with laser-sharp green terminal line pulses and intensive emerald contrast shadows"
  };

  // Mapping face state to premium character descriptions with detailed prompts
  const faceDetails = {
    shocked: {
      badge: "😲 SURPRISED SHOCK / GAME-CHANGER REVELATION",
      describe: "An expressive male content creator with wide-open eyes in total disbelief, hands near his face/cheeks, showing massive jaw-dropping astonishment, illuminated with side key-studio neon lights to dramatize the revelation."
    },
    distressed: {
      badge: "🤦‍♂️ EXTREME DISTRESS / ANXIOUS FRUSTRATION",
      describe: "An overworked developer looking highly stressed and overwhelmed, resting his head on his hand in a classic facepalm of frustration, deep shadows casting a moody low-key contrast on the scene."
    },
    confident: {
      badge: "⚡ CONFIDENT MASTER / LAUNCH OPTIMIZER",
      describe: "A confident content mastermind smiling with supreme self-assurance, looking directly into the lens, professional posture, styled under dynamic high-speed studio glow and professional backlight highlights."
    }
  }[face] || {
    badge: "😲 SURPRISED SHOCK / GAME-CHANGER REVELATION",
    describe: "An expressive male content creator with wide-open eyes in total disbelief, hands near his face/cheeks, showing massive jaw-dropping astonishment, illuminated with side key-studio neon lights to dramatize the revelation."
  };

  // Composition alignment logic
  const layoutDetails = {
    thirds: {
      name: "Rule of Thirds Cinematic Grid Setup",
      composition: "Focal graphic badges are arranged meticulously along grid lines (3x3 grid intersections). The left pane features the 'before' tragedy in dark shadows, while the right pane highlights the 'after' solution with glowing accents, tied together by a central boundary glowing gradient."
    },
    split: {
      name: "Extreme Vertical Split-Screen Comparison",
      composition: "An intense side-by-side binary layout split by a glowing neon laser vertical seam. This maximizes psychological tension between the static low-performance state (representing absolute pain) on the left side and the automated optimized state (representing extreme gain) on the right side."
    }
  }[layout] || {
    name: "Extreme Vertical Split-Screen Comparison",
    composition: "An intense side-by-side binary layout split by a glowing neon laser vertical seam. This maximizes psychological tension between the static low-performance state (representing absolute pain) on the left side and the automated optimized state (representing extreme gain) on the right side."
  };

  return `================================================================================
⚡ AXE HOURS HIGH-CTR DESIGNS: THUMBNAIL LAYOUT SPEC SHEET & MIDJOURNEY COMPILER ⚡
================================================================================

--- 📐 1. COMPOSITION & GRID STRUCTURE ---
• Dimension Target: 16:9 Landscape Video Format (Perfect aspect ratio for desktop/mobile YouTube feed)
• Alignment Ruleset: ${layoutDetails.name}
• Direction Guidelines: ${layoutDetails.composition}

--- 🎨 2. LIGHTING & COLOR SCHEME DIRECTIVES ---
• Atmosphere Name: ${themeDetails.name}
• Color Accents: ${themeDetails.glowColors}
• Lighting Dynamics: Highly dramatic studio volumetric lights, high-contrast black backdrops with rich ${themeDetails.colorDescription}.
• Environmental Ambient: ${themeDetails.ambientAura}

--- 👤 3. CENTRAL CHARACTER / INFLUENCER AVATAR SPEC ---
• Expression Profile: ${faceDetails.badge}
• Facial Detail Spec: ${faceDetails.describe}

--- 🖊️ 4. HERO OVERLAY TYPOGRAPHY ---
• Overlay Text Phrase: "${headline || "I CODED SAAS IN 24H 🤫"}"
• Typographical Directive: Rendered in a high-impact, modern display font (e.g., Space Grotesk or Cabinet Grotesque, Black weight). Font color should be extreme-contrast white with strong outer neon outlines in colors matching ${themeDetails.glowColors}. Include a heavy, crisp offset drop shadow to guarantee readability at a microscopic 100px mobile preview.
• Positioning Strategy: Centered overlay across the seam, bridging the gap between both panes for visually seamless integration.

--- 📊 5. COMPARATIVE STATISTICAL DATA BADGES ---
🔴 LEFT PANE [THE CRITICAL PROBLEM STATE]:
   - Metrics Header Accent: "${leftMetric || "OLD WAY"}"
   - Metrics Detail Subtitle: "${leftSub || "0 NEW VISITORS"}"
   - Color Styling: Desaturated dark crimson banner, custom faded gray text to represent manual struggle, low performance, and failure.
🟢 RIGHT PANE [THE OPTIMIZED SOLUTION STATE]:
   - Metrics Header Accent: "${rightMetric || "AI PROMPT ⚡"}"
   - Metrics Detail Subtitle: "${rightSub || "$12.4K RECURRING"}"
   - Color Styling: Highly saturated neon gradients with brilliant ${themeDetails.glowColors} outlines to communicate speed, automated luxury, and high-converting success.

================================================================================
🤖 READY-TO-COPY MIDJOURNEY (V6) & STABLE DIFFUSION GENERATIVE IMAGE PROMPTS
================================================================================

🔥 [PROMPT 1: DUAL-STATE EXPERIMENT SEAM - HIGHLY RECOMMENDED]
Copy & paste into Midjourney:
/imagine prompt: A high-contrast widescreen 16:9 split-screen editorial YouTube thumbnail graphic. On the left side: desaturated dark moody shadows with muted crimson highlights, showcasing a highly detailed expressive technologist representing ${face === "distressed" ? "intense frustration, exhausted with face in hands facepalm pose" : face === "shocked" ? "gasping in total shock with wide eyes and open mouth" : "focused dynamic developer with a serious intent stare"}. On the right side: an ultra-modern futuristic coding command center illuminated in a gorgeous vibrant aura of ${themeDetails.glowColors}, featuring slick translucent glassmorphic analytics badges, dynamic charts, and crisp floating glowing stat vectors. Extreme cinematic volumetric lighting, Octane render 3D depth, photorealistic details, raw cinematic aesthetics --ar 16:9 --v 6.0 --style raw

🔥 [PROMPT 2: GRAPHIC TECH PRESENTATION CANVAS]
Copy & paste into Midjourney:
/imagine prompt: A clean minimalist technology graphic design banner presentation on a pitch black studio backdrop, rule of thirds composition. Centered in the middle is glowing custom high-voltage neon typography displaying the letters "${headline || "I CODED SAAS IN 24H"}" encased in sharp 3D glossmorphic panel borders. Bright vibrant lighting splashes of ${themeDetails.glowColors}, deep saturated color gradient beams, floating performance indicators and charts, futuristic graphic design layout, modern premium YouTuber branding aesthetic --ar 16:9 --style raw

🔥 [PROMPT 3: CRISP INFLUENCER AVATAR HERO SHOT]
Copy & paste into Midjourney:
/imagine prompt: A cinematic studio close-up portrait of a tech content creator looking straight into the lens, showing a ${face === "distressed" ? "deeply distressed, stressed and thoughtful hand-on-head look" : face === "shocked" ? "highly enthusiastic, energetic mouth-agape shocked look of surprise" : "supremely confident, smiling and genius developer look of victory"}, sharp studio focus, dressed in trendy streetwear. In the background: a modern darkened tech workspace with glowing neon light bars illuminating the atmosphere in deep ${themeDetails.glowColors} backlights. Luxurious lens depth of field blur, high professional key-light details, 8k resolution --ar 16:9 --v 6.0 --style raw
`;
};
