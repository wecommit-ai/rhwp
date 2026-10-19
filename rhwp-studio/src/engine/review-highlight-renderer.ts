import type { SelectionRect } from '@/core/types';
import { VirtualScroll } from '@/view/virtual-scroll';

/** [genDOC BAC-840] 검토(AI 첨삭) 앵커 범위를 반투명 사각형으로 상시 표시하는 별도 레이어.
 *  CommentHighlightRenderer 와 완전히 독립된 오버레이다 — 코멘트 레이어를 건드리지 않고,
 *  코멘트 레이어도 이쪽을 건드리지 않는다. 기본 색은 코멘트(노랑)와 구분되는 인디고 틴트이고,
 *  z-index 는 코멘트(4)보다 한 단계 아래(3)라 겹칠 때 코멘트 하이라이트가 위에 보인다(드래그
 *  선택은 그보다 더 위). 항목별 color 를 넘기면 그 색으로 그린다(카테고리 구분용, 옵션). */
export class ReviewHighlightRenderer {
  private layer: HTMLDivElement;
  private groups = new Map<string, HTMLDivElement[]>();

  private static readonly BASE_BG = 'rgba(99,102,241,0.22)';
  private static readonly FLASH_BG = 'rgba(79,70,229,0.55)';

  constructor(
    private container: HTMLElement,
    private virtualScroll: VirtualScroll,
  ) {
    this.layer = document.createElement('div');
    this.layer.className = 'review-highlight-layer';
    this.layer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:3;';
    const scrollContent = container.querySelector('#scroll-content');
    if (scrollContent) {
      scrollContent.appendChild(this.layer);
    }
  }

  /** 검토별 줄 사각형 묶음을 통째로 다시 그린다(좌표는 줌 적용 전, SelectionRenderer 와 동일 규약).
   *  group.color 가 있으면 그 색으로, 없으면 BASE_BG 로 그린다. */
  render(groups: Array<{ id: string; rects: SelectionRect[]; color?: string }>, zoom: number): void {
    this.ensureAttached();
    this.clear();
    const scrollContent = this.container.querySelector('#scroll-content');
    if (!scrollContent) return;
    const contentWidth = scrollContent.clientWidth;

    for (const g of groups) {
      const bg = g.color || ReviewHighlightRenderer.BASE_BG;
      const divs: HTMLDivElement[] = [];
      for (const rect of g.rects) {
        const pageOffset = this.virtualScroll.getPageOffset(rect.pageIndex);
        const pageDisplayWidth = this.virtualScroll.getPageWidth(rect.pageIndex);
        const pageLeft = (contentWidth - pageDisplayWidth) / 2;
        const div = document.createElement('div');
        div.style.cssText =
          `position:absolute;background:${bg};border-radius:2px;` +
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

  /** 해당 검토 하이라이트를 잠시 진하게 플래시한다(카드 클릭 점프 시 시선 유도). */
  flash(id: string): void {
    const divs = this.groups.get(id);
    if (!divs || divs.length === 0) return;
    for (const div of divs) div.style.backgroundColor = ReviewHighlightRenderer.FLASH_BG;
    setTimeout(() => {
      // 사이 재렌더로 교체됐어도 stale div 에 색만 입히고 끝 — 무해.
      for (const div of divs) div.style.backgroundColor = ReviewHighlightRenderer.BASE_BG;
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
