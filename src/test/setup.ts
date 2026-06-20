import { afterEach, expect } from "vite-plus/test";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

type ObserverEntry = {
  observer: IntersectionObserver;
  callback: IntersectionObserverCallback;
  targets: Set<Element>;
};

const observers = new Set<ObserverEntry>();

// `implements IntersectionObserver` を付けると、constructor 内で
// `this as IntersectionObserver` への代入が成立しない（class 内では
// 'this' が完全型に解決されず TS2322 になる）ため、duck-typing で揃える。
class FakeIntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: readonly number[] = [];
  private readonly entry: ObserverEntry;

  constructor(callback: IntersectionObserverCallback) {
    this.entry = {
      observer: this as unknown as IntersectionObserver,
      callback,
      targets: new Set(),
    };
    observers.add(this.entry);
  }

  observe(target: Element): void {
    this.entry.targets.add(target);
  }

  unobserve(target: Element): void {
    this.entry.targets.delete(target);
  }

  disconnect(): void {
    this.entry.targets.clear();
    observers.delete(this.entry);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

globalThis.IntersectionObserver =
  FakeIntersectionObserver as unknown as typeof IntersectionObserver;

/** テストからセンチネル等の要素を強制的に「交差した」状態にする。 */
export function triggerIntersect(target: Element, isIntersecting = true): void {
  for (const entry of observers) {
    if (!entry.targets.has(target)) continue;
    const record = {
      target,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: target.getBoundingClientRect(),
      intersectionRect: target.getBoundingClientRect(),
      rootBounds: null,
      time: 0,
    } as IntersectionObserverEntry;
    entry.callback([record], entry.observer);
  }
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  observers.clear();
});
