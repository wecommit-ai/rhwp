import assert from 'node:assert/strict';
import test from 'node:test';
import { loadWebFonts } from '../src/core/font-loader.ts';

// [genDOC BAC-2067] 초기화와 문서 열기가 함초롬을 동시에 요청해도 한 번만 받고, 앱 woff2 를 CDN 보다 먼저 받는다.
test('동시에 부른 loadWebFonts 는 같은 파일을 한 번만 받고, 로컬 글꼴을 CDN 보다 먼저 받는다', async () => {
  const loads: string[] = [];
  const previousDocument = (globalThis as typeof globalThis & { document?: unknown }).document;
  const previousFontFace = (globalThis as typeof globalThis & { FontFace?: unknown }).FontFace;
  const styles: Array<{ id: string; textContent: string }> = [];
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      head: { appendChild(el: { id: string; textContent: string }) { styles.push(el); } },
      createElement() { return { id: '', textContent: '' }; },
      getElementById(id: string) { return styles.find(s => s.id === id) ?? null; },
      fonts: { check() { return false; }, add() {} },
    },
  });
  class FakeFontFace {
    source: string;
    constructor(_family: string, source: string) { this.source = source; }
    async load(): Promise<FakeFontFace> {
      loads.push(this.source);
      await new Promise(resolve => setTimeout(resolve, 20));
      return this;
    }
  }
  Object.defineProperty(globalThis, 'FontFace', { configurable: true, value: FakeFontFace });
  try {
    await Promise.all([loadWebFonts(['HY헤드라인M']), loadWebFonts([])]);
    const hcr = loads.filter(s => /HANBatang|HCRDotum/.test(s));
    assert.equal(hcr.length, 2, `함초롬 2종은 한 번씩만: ${hcr.join(', ')}`);
    const firstCdn = loads.findIndex(s => s.includes('https://'));
    const local = loads.findIndex(s => s.includes('fonts/'));
    assert.ok(local >= 0 && local < firstCdn || firstCdn === -1, `로컬 먼저: ${loads.join(', ')}`);
  } finally {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: previousDocument });
    Object.defineProperty(globalThis, 'FontFace', { configurable: true, value: previousFontFace });
  }
});
