function num(value: number) {
  return Number(value.toFixed(2));
}

/** Original vector motifs. Drawn in a local box and positioned by the renderer. */
export function motifMarkup(
  motif: string,
  width: number,
  height: number,
  color: string
): string {
  const w = num(width);
  const h = num(height);
  switch (motif) {
    case "corner":
      return `
        <path d="M2 ${h - 2} C ${w * 0.08} ${h * 0.42}, ${w * 0.38} 8, ${w - 2} 8" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M16 ${h - 16} C ${w * 0.16} ${h * 0.5}, ${w * 0.46} 22, ${w - 18} 22" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.75"/>
        <circle cx="${w * 0.78}" cy="${h * 0.22}" r="3.2" fill="${color}"/>
      `;
    case "botanical":
      return `
        <path d="M${w * 0.5} ${h - 4} C ${w * 0.5} ${h * 0.62}, ${w * 0.42} ${h * 0.4}, ${w * 0.5} 6" fill="none" stroke="${color}" stroke-width="1.6"/>
        <path d="M${w * 0.5} ${h * 0.72} C ${w * 0.2} ${h * 0.62}, ${w * 0.12} ${h * 0.42}, ${w * 0.28} ${h * 0.34} C ${w * 0.22} ${h * 0.55}, ${w * 0.34} ${h * 0.66}, ${w * 0.5} ${h * 0.72}" fill="${color}" opacity="0.85"/>
        <path d="M${w * 0.5} ${h * 0.58} C ${w * 0.78} ${h * 0.5}, ${w * 0.86} ${h * 0.32}, ${w * 0.7} ${h * 0.24} C ${w * 0.78} ${h * 0.42}, ${w * 0.66} ${h * 0.52}, ${w * 0.5} ${h * 0.58}" fill="${color}" opacity="0.75"/>
        <path d="M${w * 0.5} ${h * 0.4} C ${w * 0.28} ${h * 0.32}, ${w * 0.22} ${h * 0.16}, ${w * 0.36} ${h * 0.1} C ${w * 0.3} ${h * 0.24}, ${w * 0.4} ${h * 0.34}, ${w * 0.5} ${h * 0.4}" fill="${color}" opacity="0.65"/>
      `;
    case "rings":
      return `
        <circle cx="${w * 0.42}" cy="${h * 0.5}" r="${Math.min(w, h) * 0.28}" fill="none" stroke="${color}" stroke-width="2"/>
        <circle cx="${w * 0.58}" cy="${h * 0.5}" r="${Math.min(w, h) * 0.28}" fill="none" stroke="${color}" stroke-width="2"/>
      `;
    case "diamond":
      return `
        <path d="M${w / 2} 2 L${w - 2} ${h / 2} L${w / 2} ${h - 2} L2 ${h / 2} Z" fill="none" stroke="${color}" stroke-width="1.6"/>
        <path d="M${w / 2} ${h * 0.22} L${w * 0.78} ${h / 2} L${w / 2} ${h * 0.78} L${w * 0.22} ${h / 2} Z" fill="${color}" opacity="0.18"/>
      `;
    case "stars":
      return [0.2, 0.5, 0.78]
        .map((cx, index) => star(w * cx, h * (0.35 + (index % 2) * 0.3), Math.min(w, h) * 0.12, color))
        .join("");
    case "dots":
      return Array.from({ length: 5 }, (_, index) => {
        const cx = (w / 6) * (index + 1);
        return `<circle cx="${num(cx)}" cy="${h / 2}" r="${index === 2 ? 4 : 2.4}" fill="${color}" opacity="${index === 2 ? 1 : 0.55}"/>`;
      }).join("");
    case "branch":
      return `
        <path d="M4 ${h * 0.7} C ${w * 0.3} ${h * 0.55}, ${w * 0.55} ${h * 0.3}, ${w - 4} ${h * 0.18}" fill="none" stroke="${color}" stroke-width="1.5"/>
        <ellipse cx="${w * 0.32}" cy="${h * 0.48}" rx="${w * 0.08}" ry="${h * 0.16}" fill="${color}" opacity="0.8" transform="rotate(-30 ${w * 0.32} ${h * 0.48})"/>
        <ellipse cx="${w * 0.55}" cy="${h * 0.34}" rx="${w * 0.08}" ry="${h * 0.15}" fill="${color}" opacity="0.7" transform="rotate(24 ${w * 0.55} ${h * 0.34})"/>
        <ellipse cx="${w * 0.74}" cy="${h * 0.24}" rx="${w * 0.07}" ry="${h * 0.13}" fill="${color}" opacity="0.6" transform="rotate(-18 ${w * 0.74} ${h * 0.24})"/>
      `;
    case "medallion":
      return `
        <circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) * 0.46}" fill="none" stroke="${color}" stroke-width="1.4"/>
        <circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) * 0.34}" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.7"/>
        <circle cx="${w / 2}" cy="${h / 2}" r="3" fill="${color}"/>
      `;
    case "rule":
      return `
        <line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="${color}" stroke-width="1"/>
        <path d="M${w / 2} ${h * 0.15} L${w * 0.56} ${h / 2} L${w / 2} ${h * 0.85} L${w * 0.44} ${h / 2} Z" fill="${color}"/>
      `;
    case "mandala":
      return `
        <circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) * 0.48}" fill="none" stroke="${color}" stroke-width="1" opacity="0.45"/>
        <circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) * 0.34}" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.7"/>
        <circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) * 0.18}" fill="none" stroke="${color}" stroke-width="1.4"/>
        ${Array.from({ length: 12 }, (_, index) => {
          const angle = (Math.PI * 2 * index) / 12;
          const r1 = Math.min(w, h) * 0.36;
          const r2 = Math.min(w, h) * 0.46;
          const x1 = w / 2 + Math.cos(angle) * r1;
          const y1 = h / 2 + Math.sin(angle) * r1;
          const x2 = w / 2 + Math.cos(angle) * r2;
          const y2 = h / 2 + Math.sin(angle) * r2;
          return `<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}" stroke="${color}" stroke-width="1.2"/>`;
        }).join("")}
      `;
    case "arch":
      return `
        <path d="M4 ${h - 2} V ${h * 0.42} C 4 ${h * 0.08}, ${w - 4} ${h * 0.08}, ${w - 4} ${h * 0.42} V ${h - 2}" fill="none" stroke="${color}" stroke-width="2"/>
      `;
    case "grid":
      return `
        <rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="${color}" stroke-width="1.2"/>
        <line x1="${w * 0.33}" y1="1" x2="${w * 0.33}" y2="${h - 1}" stroke="${color}" stroke-width="0.6" opacity="0.5"/>
        <line x1="${w * 0.66}" y1="1" x2="${w * 0.66}" y2="${h - 1}" stroke="${color}" stroke-width="0.6" opacity="0.5"/>
      `;
    default:
      return "";
  }
}

function star(cx: number, cy: number, r: number, color: string) {
  const points = Array.from({ length: 4 }, (_, index) => {
    const outer = (Math.PI / 2) * index - Math.PI / 2;
    const inner = outer + Math.PI / 4;
    return [
      [cx + Math.cos(outer) * r, cy + Math.sin(outer) * r],
      [cx + Math.cos(inner) * r * 0.38, cy + Math.sin(inner) * r * 0.38],
    ];
  })
    .flat()
    .map(([x, y]) => `${num(x)},${num(y)}`)
    .join(" ");
  return `<polygon points="${points}" fill="${color}"/>`;
}
