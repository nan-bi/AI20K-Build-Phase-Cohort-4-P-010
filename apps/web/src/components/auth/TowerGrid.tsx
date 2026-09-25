const WINDOW_W = 13;
const WINDOW_H = 9;
const GAP_X = 6;
const GAP_Y = 7;

interface TowerSpec {
  x: number;
  y: number;
  cols: number;
  rows: number;
  /** "col,row" pairs lit in the accent color, art-directed (not random). */
  lit: string[];
}

// Two blocks at slightly different heights and a shared offset, echoing how
// the product always locates a unit as [Tòa - Tầng - Căn] across two towers
// (e.g. the S1/S2 blocks used throughout docs/SAD.md). The lit windows sweep
// on a diagonal, like dusk light landing unevenly across the facade.
const TOWERS: TowerSpec[] = [
  {
    x: 18,
    y: 54,
    cols: 6,
    rows: 13,
    lit: [
      "5,2",
      "4,3",
      "5,3",
      "3,4",
      "4,4",
      "2,5",
      "3,5",
      "1,6",
      "2,6",
      "0,7",
      "1,7",
      "0,8",
      "2,9",
      "4,10",
      "5,11",
    ],
  },
  {
    x: 168,
    y: 118,
    cols: 5,
    rows: 9,
    lit: ["4,1", "3,2", "2,3", "3,3", "1,4", "0,5", "2,6", "1,7"],
  },
];

/**
 * Two apartment-tower facades built from a grid of windows, a handful lit —
 * the brand's single graphic idea for the admin sign-in screen. Abstract on
 * purpose (no literal unit-code labels): the grid itself is the reference to
 * "many individually tracked units," which is what the product actually
 * does, rather than decoration borrowed from elsewhere.
 */
export function TowerGrid() {
  return (
    <svg
      viewBox="0 0 320 380"
      role="img"
      aria-label="Minh hoạ các toà căn hộ với vài ô cửa sổ sáng đèn"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {TOWERS.map((tower, towerIndex) => {
        const litSet = new Set(tower.lit);
        const windows = [];
        for (let row = 0; row < tower.rows; row++) {
          for (let col = 0; col < tower.cols; col++) {
            const isLit = litSet.has(`${col},${row}`);
            windows.push(
              <rect
                key={`${towerIndex}-${col}-${row}`}
                x={tower.x + col * (WINDOW_W + GAP_X)}
                y={tower.y + row * (WINDOW_H + GAP_Y)}
                width={WINDOW_W}
                height={WINDOW_H}
                rx={1.5}
                fill={isLit ? "var(--accent, #D69A46)" : "rgba(255,255,255,0.14)"}
              />,
            );
          }
        }
        return windows;
      })}
    </svg>
  );
}
