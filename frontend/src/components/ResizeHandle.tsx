import { useCallback, useRef } from "react";

type ResizeHandleProps = {
  direction: "horizontal" | "vertical";
  onResize: (delta: number) => void;
  side?: "left" | "right" | "top" | "bottom";
};

export function ResizeHandle({ direction, onResize, side = "right" }: ResizeHandleProps) {
  const dragging = useRef(false);
  const lastPos = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      lastPos.current = direction === "horizontal" ? e.clientX : e.clientY;

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const current = direction === "horizontal" ? ev.clientX : ev.clientY;
        const delta = current - lastPos.current;
        lastPos.current = current;
        const adjusted = side === "left" || side === "top" ? -delta : delta;
        onResize(adjusted);
      };

      const onMouseUp = () => {
        dragging.current = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [direction, onResize, side],
  );

  const isH = direction === "horizontal";

  return (
    <div
      onMouseDown={onMouseDown}
      className="group flex shrink-0 items-center justify-center"
      style={{
        cursor: isH ? "col-resize" : "row-resize",
        width: isH ? 6 : "100%",
        height: isH ? "100%" : 6,
        zIndex: 20,
      }}
    >
      <div
        className="rounded-full transition-colors group-hover:bg-[var(--ac-accent)]"
        style={{
          background: "var(--ac-border)",
          width: isH ? 3 : 32,
          height: isH ? 32 : 3,
        }}
      />
    </div>
  );
}
