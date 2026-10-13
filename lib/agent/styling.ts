import type { TasteInput } from "../schema";
// Authored styling rules, not Qloo classifications or product inventory.
const wardrobes: Record<string, [string, string, string, string]> = {
  "Relaxed tailoring": [
    "Unstructured blazer",
    "Cotton shirt",
    "Wide-leg trousers",
    "Loafers",
  ],
  Minimalism: [
    "Clean-lined overshirt",
    "Plain crew-neck tee",
    "Straight-leg trousers",
    "Simple sneakers",
  ],
  Streetwear: [
    "Boxy jacket",
    "Oversized tee",
    "Cargo trousers",
    "Low-top sneakers",
  ],
  Vintage: [
    "Secondhand cardigan",
    "Collared shirt",
    "Straight-cut jeans",
    "Loafers",
  ],
  Bohemian: [
    "Lightweight woven layer",
    "Relaxed blouse",
    "Flowing trousers",
    "Flat sandals",
  ],
  "Statement pieces": [
    "Sculptural jacket",
    "Simple base layer",
    "Bold-cut trousers",
    "Statement shoes",
  ],
};
export function composeStyling(input: TasteInput, evening = false) {
  const style =
    input.fashion.find((s) => Object.hasOwn(wardrobes, s)) ||
    "Relaxed tailoring";
  const pieces = [...wardrobes[style]];
  const decisions = [
    `Silhouette follows your ${input.fashion.includes(style) ? style.toLowerCase() : "default relaxed tailoring"} direction.`,
  ];
  const occasion = input.occasion.toLowerCase();
  const outdoor = /hike|outdoor|walk|nature/.test(occasion);
  const formal = /formal|wedding|interview|office/.test(occasion);
  if (outdoor) {
    pieces[0] = "Packable weather layer";
    pieces[3] = "Supportive walking shoes";
    decisions.push(
      "Outdoor or walking occasion: prioritize a portable layer and supportive footwear. Check the actual forecast.",
    );
  } else if (formal) {
    pieces[0] = "Structured blazer";
    pieces[2] = "Tailored trousers";
    pieces[3] = "Polished closed-toe shoes";
    decisions.push(
      "Formal occasion: replace casual outerwear and footwear with tailored options. Confirm the event dress code.",
    );
  } else if (evening) {
    pieces[1] = "Textured knit top";
    decisions.push(
      "Evening variation: replace the base layer with a textured knit.",
    );
  } else if (input.lifestyle.includes("Art galleries")) {
    pieces[3] = "Comfortable flat shoes";
    decisions.push(
      "Your gallery interest suggests comfortable footwear for time spent standing.",
    );
  }
  if (input.budget === "Under $100") {
    if (!outdoor && !formal) pieces.shift();
    decisions.push(
      outdoor || formal
        ? "Lower budget: retain the occasion-specific layer; prioritize borrowing or pieces you already own. The total is not price-verified."
        : "Lower budget: omit the extra outer layer and start with pieces you already own or secondhand options. The total is not price-verified.",
    );
  } else if (input.budget !== "Open") {
    decisions.push(
      `Budget preference ${input.budget}: prioritize the main silhouette before optional accessories. No prices or total-cost guarantee.`,
    );
  }
  if (input.colors.length)
    decisions.push(
      `Color direction: ${input.colors.join(", ")}. Use your preferred colors across the pieces; this is an authored interpretation.`,
    );
  if (input.fashion.length > 1)
    decisions.push(
      `This concept prioritizes ${style}; additional style selections are not all resolved by these rules.`,
    );
  return { pieces, decisions };
}
