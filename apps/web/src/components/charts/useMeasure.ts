"use client";

import { useState } from "react";

/** Đo chiều rộng khung chứa để vẽ SVG theo đúng kích thước thật (chữ trục luôn cùng cỡ, không bị phóng to). */
export function useMeasure(initial = 640): [number, (node: HTMLElement | null) => void | (() => void)] {
  const [width, setWidth] = useState(initial);
  const attach = (node: HTMLElement | null) => {
    if (!node) return;
    const update = () => setWidth(Math.max(320, Math.round(node.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  };
  return [width, attach];
}
