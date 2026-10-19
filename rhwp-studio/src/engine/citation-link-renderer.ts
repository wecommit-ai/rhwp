import type { SelectionRect } from '@/core/types';
import { VirtualScroll } from '@/view/virtual-scroll';

/** [genDOC BAC-701] 출처 인용 구간을 클릭 가능한 링크 영역으로 만든다.
 *  CommentHighlightRenderer(패치 0023)와 같은 DOM 오버레이 방식이되, 배경 대신 투명
 *  클릭영역(cursor:pointer, pointer-events:auto)을 깔고 클릭 시 호스트로
 *  postMessage({ type: 'gendoc:rhwp:citation-click', url })를 보낸다 — 호스트가 새 탭으로 연다.
 *  글자 파랑·밑줄은 applyCharFormat(문서 서식)이 담당하므로 여기선 시각 효과를 더하지 않는다. */
export class CitationLinkRenderer {
  private layer: HTMLDivElement;
  private groups = new Map<string, HTMLDivElement[]>();

  constructor(
    private container: HTMLElement,
    private virtualScroll: VirtualScroll,
  ) {
    this.layer = document.createElement('div');
    this.layer.className = 'citation-link-layer';
    // 레이어 자체는 클릭을 막지 않고(none) 링크 rect 만 auto — 문서 편집 클릭과 공존한다.
    this.layer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;';
    const scrollContent = container.querySelector('#scroll-content');
    if (scrollContent) {
      scrollContent.appendChild(this.layer);
    }
  }

  /** 링크별 줄 사각형 묶음을 통째로 다시 그린다(좌표는 줌 적용 전, SelectionRenderer 와 동일 규약). */
  render(groups: Array<{ id: string; url: string; rects: SelectionRect[] }>, zoom: number): void {
    this.ensureAttached();
    this.clear();
    const scrollContent = this.container.querySelector('#scroll-content');
    if (!scrollContent) return;
    const contentWidth = scrollContent.clientWidth;

    for (const g of groups) {
      if (!/^https?:\/\//.test(g.url)) continue; // 안전: http(s) 외 스킴은 링크화하지 않는다
      const divs: HTMLDivElement[] = [];
      for (const rect of g.rects) {
        const pageOffset = this.virtualScroll.getPageOffset(rect.pageIndex);
        const pageDisplayWidth = this.virtualScroll.getPageWidth(rect.pageIndex);
        const pageLeft = (contentWidth - pageDisplayWidth) / 2;
        const div = document.createElement('div');
        div.style.cssText = 'position:absolute;background:transparent;cursor:pointer;pointer-events:auto;';
        div.style.left = `${(pageLeft + rect.x * zoom).toFixed(2)}px`;
        div.style.top = `${(pageOffset + rect.y * zoom).toFixed(2)}px`;
        div.style.width = `${(rect.width * zoom).toFixed(2)}px`;
        div.style.height = `${(rect.height * zoom).toFixed(2)}px`;
        div.title = g.url;
        // 캐럿 배치(mousedown)를 소비해 편집 클릭과 충돌하지 않게 한다 — 링크 위 편집은 주변 클릭으로.
        div.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        div.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (window.parent !== window) {
            window.parent.postMessage({ type: 'gendoc:rhwp:citation-click', url: g.url }, '*');
          }
        });
        this.layer.appendChild(div);
        divs.push(div);
      }
      this.groups.set(g.id, divs);
    }
  }

  clear(): void {
    this.layer.textContent = '';
    this.groups.clear();
  }

  /** 레이어가 DOM에 없으면 재부착한다 (loadDocument 후 컨테이너 교체 대응) */
  private ensureAttached(): void {
    if (this.layer.parentElement) return;
    const scrollContent = this.container.querySelector('#scroll-content');
    if (scrollContent) {
      scrollContent.appendChild(this.layer);
    }
  }

  dispose(): void {
    this.clear();
    this.layer.remove();
  }
}
