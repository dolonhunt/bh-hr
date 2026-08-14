"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================
// SignaturePad
//
// Canvas-based signature pad. Supports mouse + touch drawing with
// smooth quadratic-curve interpolation between points (so the line
// looks like a real pen stroke, not jagged polyline segments).
//
// Props:
//   onChange (data: string) => void — called with the base64 PNG data
//                                  URL of the current canvas content.
//                                  Called with "" when the pad is
//                                  cleared or has no strokes.
//   className? — additional classes for the wrapper div.
//
// Behaviour:
//   - 200px tall, full-width responsive canvas.
//   - Pen color #1a1a1a, width 2px.
//   - High-DPI aware (uses devicePixelRatio for crisp lines).
//   - "Clear" button resets the canvas and emits "".
//   - "Done" button captures the canvas as a PNG data URL and emits it.
//   - Touch events call preventDefault so the page doesn't scroll while
//     drawing on mobile.
// =============================================================

interface Point {
  x: number;
  y: number;
}

interface Props {
  onChange: (data: string) => void;
  className?: string;
}

const PEN_COLOR = "#1a1a1a";
const PEN_WIDTH = 2;

export function SignaturePad({ onChange, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const midPointRef = useRef<Point | null>(null);
  const hasStrokesRef = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  // ---- Initialise canvas + handle resize ----
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    // Save current content so resize doesn't wipe the signature.
    let snapshot: ImageData | null = null;
    if (ctxRef.current && canvas.width > 0 && canvas.height > 0) {
      try {
        snapshot = ctxRef.current.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        snapshot = null;
      }
    }
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = PEN_COLOR;
    ctx.lineWidth = PEN_WIDTH;
    ctxRef.current = ctx;
    // Restore the snapshot (so the signature persists across resizes).
    if (snapshot) {
      try {
        ctx.putImageData(snapshot, 0, 0);
      } catch {
        // ignore — just start fresh
      }
    }
  }, []);

  useEffect(() => {
    initCanvas();
    // Re-init on window resize (the canvas is responsive so its CSS width changes).
    const onResize = () => initCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [initCanvas]);

  // ---- Coordinate helpers ----
  const getPointFromEvent = (e: PointerEvent | MouseEvent | Touch): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // ---- Drawing handlers ----
  const startDraw = useCallback((pt: Point) => {
    drawingRef.current = true;
    lastPointRef.current = pt;
    midPointRef.current = null;
    hasStrokesRef.current = true;
    setHasStrokes(true);
    // Draw a dot so single taps show a visible mark.
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, PEN_WIDTH / 2, 0, Math.PI * 2);
    ctx.fillStyle = PEN_COLOR;
    ctx.fill();
  }, []);

  const moveDraw = useCallback((pt: Point) => {
    if (!drawingRef.current) return;
    const ctx = ctxRef.current;
    const last = lastPointRef.current;
    if (!ctx || !last) return;

    // Smooth midpoint interpolation: draw a quadratic curve from the last
    // point to the midpoint of [last, current], using the previous midpoint
    // as the control point. This produces a smooth, hand-drawn feel.
    const newMid: Point = {
      x: (last.x + pt.x) / 2,
      y: (last.y + pt.y) / 2,
    };

    ctx.beginPath();
    if (midPointRef.current) {
      ctx.moveTo(midPointRef.current.x, midPointRef.current.y);
      ctx.quadraticCurveTo(last.x, last.y, newMid.x, newMid.y);
    } else {
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(newMid.x, newMid.y);
    }
    ctx.stroke();

    midPointRef.current = newMid;
    lastPointRef.current = pt;
  }, []);

  const endDraw = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    midPointRef.current = null;
  }, []);

  // ---- Mouse handlers ----
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    startDraw(getPointFromEvent(e.nativeEvent));
  };
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    moveDraw(getPointFromEvent(e.nativeEvent));
  };
  const onMouseUp = () => endDraw();
  const onMouseLeave = () => endDraw();

  // ---- Touch handlers ----
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    startDraw(getPointFromEvent(e.touches[0]));
  };
  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || e.touches.length === 0) return;
    e.preventDefault();
    moveDraw(getPointFromEvent(e.touches[0]));
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    endDraw();
  };

  // ---- Clear / Done ----
  function clear() {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokesRef.current = false;
    setHasStrokes(false);
    onChange("");
  }

  function done() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasStrokesRef.current) {
      onChange("");
      return;
    }
    // Trim trailing transparent pixels for a compact signature image.
    // (Quick approach: just emit the full canvas — the consumer can crop if needed.)
    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative rounded-md border border-border bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="block w-full h-[200px] touch-none cursor-crosshair"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
        {!hasStrokes && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-muted-foreground italic">
              Draw your signature here
            </span>
          </div>
        )}
        {/* Signature baseline */}
        <div className="absolute left-4 right-4 bottom-8 border-b border-dashed border-muted-foreground/30 pointer-events-none" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">
          {hasStrokes
            ? "Signature captured — click Done to use it."
            : "Pen color #1a1a1a, width 2px. Use mouse or touch."}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={clear}
            disabled={!hasStrokes}
            className="h-7 text-xs"
          >
            <Eraser className="size-3.5 mr-1" />
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={done}
            disabled={!hasStrokes}
            className="h-7 text-xs border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800"
          >
            <Check className="size-3.5 mr-1" />
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
