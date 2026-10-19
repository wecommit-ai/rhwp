import type { CommandDef } from '../types';

/* [genDOC host integration] 호스트(genDOC React) 가 자체 UI 를 띄울 수 있도록
 * 메뉴 클릭을 부모 window 에 postMessage 로 신호한다. 스탠드얼론(부모 없음)에서는
 * no-op. 차트 PNG 자체의 삽입은 별도 RPC(`insertPicture`, patch 0008)가 담당. */
export const gendocCommands: CommandDef[] = [
  {
    id: 'gendoc:chart',
    label: '차트 삽입',
    icon: 'icon-image',
    canExecute: (ctx) => ctx.hasDocument,
    execute() {
      try {
        if (typeof window !== 'undefined' && window.parent !== window) {
          window.parent.postMessage({ type: 'gendoc:rhwp:open-chart-picker' }, '*');
        }
      } catch { /* host 없음 — 무시 */ }
    },
  },
];
