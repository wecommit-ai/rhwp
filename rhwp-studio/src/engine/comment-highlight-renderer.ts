import type { SelectionRect } from '@/core/types';
import { VirtualScroll } from '@/view/virtual-scroll';

/** [genDOC FE-609] 코멘트 앵커 범위를 노란 반투명 사각형으로 상시 표시한다.
 *  SelectionRenderer(파란 드래그 선택)와 같은 DOM 오버레이 방식이되 z-index 가 한 단계
 *  아래(4)라 드래그 선택이 항상 위에 보인다. 코멘트별 사각형 묶음을 id 로 관리해
 *  flash(id)로 클릭 점프 시 잠시 진하게 강조할 수 있다. */
export class CommentHighlightRenderer {
  private layer: HTMLDivElement;
  private groups = new Map<string, HTMLDivElement[]>();

  private static readonly BASE_BG = 'rgba(255,212,0,0.30)';
  private static readonly FLASH_BG = 'rgba(255,170,0,0.70)';

  constructor(
    private container: HTMLElement,
    private virtualScroll: VirtualScroll,
  ) {
    this.layer = document.createElement('div');
    this.layer.className = 'comment-highlight-layer';
    this.layer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:4;';
    const scrollContent = container.querySelector('#scroll-content');
    if (scrollContent) {
      scrollContent.appendChild(this.layer);
    }
  }

  /** 코멘트별 줄 사각형 묶음을 통째로 다시 그린다(좌표는 줌 적용 전, SelectionRenderer 와 동일 규약). */
  render(groups: Array<{ id: string; rects: SelectionRect[] }>, zoom: number): void {
    this.ensureAttached();
    this.clear();
    const scrollContent = this.container.querySelector('#scroll-content');
    if (!scrollContent) return;
    const contentWidth = scrollContent.clientWidth;

    for (const g of groups) {
      const divs: HTMLDivElement[] = [];
      for (const rect of g.rects) {
        const pageOffset = this.virtualScroll.getPageOffset(rect.pageIndex);
        const pageDisplayWidth = this.virtualScroll.getPageWidth(rect.pageIndex);
        const pageLeft = (contentWidth - pageDisplayWidth) / 2;
        const div = document.createElement('div');
        div.style.cssText =
          `position:absolute;background:${CommentHighlightRenderer.BASE_BG};border-radius:2px;` +
          'pointer-events:none;transition:background-color 0.35s ease;';
        div.style.left = `${(pageLeft + rect.x * zoom).toFixed(2)}px`;
        div.style.top = `${(pageOffset + rect.y * zoom).toFixed(2)}px`;
        div.style.width = `${(rect.width * zoom).toFixed(2)}px`;
        div.style.height = `${(rect.height * zoom).toFixed(2)}px`;
        this.layer.appendChild(div);
        divs.push(div);
      }
      this.groups.set(g.id, divs);
    }
  }

  /** 해당 코멘트 하이라이트를 잠시 진하게 플래시한다(클릭 점프 시 시선 유도). */
  flash(id: string): void {
    const divs = this.groups.get(id);
    if (!divs || divs.length === 0) return;
    for (const div of divs) div.style.backgroundColor = CommentHighlightRenderer.FLASH_BG;
    setTimeout(() => {
      // 사이 재렌더로 교체됐어도 stale div 에 색만 입히고 끝 — 무해.
      for (const div of divs) div.style.backgroundColor = CommentHighlightRenderer.BASE_BG;
    }, 700);
  }

  /** 첫 줄 사각형의 문서 y(px, 줌·페이지 오프셋 반영) — 스크롤 타깃 계산용. 없으면 null. */
  topOf(id: string): number | null {
    const divs = this.groups.get(id);
    if (!divs || divs.length === 0) return null;
    return parseFloat(divs[0].style.top);
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
