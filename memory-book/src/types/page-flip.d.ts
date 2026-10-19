// The `page-flip` package (StPageFlip) ships without type declarations for its
// browser bundle, so we declare the small part of its API we use.
declare module "page-flip" {
  export interface FlipSetting {
    startPage?: number;
    size?: "fixed" | "stretch";
    width: number;
    height: number;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    swipeDistance?: number;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
  }

  export interface WidgetEvent<T = unknown> {
    data: T;
    object: PageFlip;
  }

  export class PageFlip {
    constructor(element: HTMLElement, setting: FlipSetting);
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    updateFromHtml(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    destroy(): void;
    update(): void;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    flip(page: number, corner?: "top" | "bottom"): void;
    turnToPage(page: number): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): "portrait" | "landscape";
    on(event: "flip", cb: (e: WidgetEvent<number>) => void): PageFlip;
    on(event: "changeOrientation", cb: (e: WidgetEvent<"portrait" | "landscape">) => void): PageFlip;
    on(event: "changeState", cb: (e: WidgetEvent<string>) => void): PageFlip;
    on(event: "init" | "update", cb: (e: WidgetEvent<{ page: number; mode: string }>) => void): PageFlip;
    off(event: string): void;
  }
}
