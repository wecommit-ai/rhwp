//! genDOC 0018 — 행 삽입·삭제는 표 폭을 바꾸지 않는다 (2026-11-26 운영 QA, 양천 창업허브 신청서).
//!
//! 행마다 열 경계가 다른 표는 열별 최대 셀 폭의 합(47625 → 42542)이 실제 폭과 달라, 행을 더하면
//! 가운데 정렬 표가 오른쪽으로 34px 밀렸고 행을 지워도 돌아오지 않았다.
#![cfg(not(target_arch = "wasm32"))]

use rhwp::model::control::Control;
use rhwp::DocumentCore;

const SAMPLE: &str = "samples/gendoc-yangcheon-form.hwp";

fn table_width(core: &DocumentCore, para: usize) -> (u32, u32) {
    match &core.document().sections[0].paragraphs[para].controls[0] {
        Control::Table(t) => {
            let raw = if t.raw_ctrl_data.len() >= 16 {
                u32::from_le_bytes(t.raw_ctrl_data[12..16].try_into().unwrap())
            } else {
                t.common.width
            };
            (t.common.width, raw)
        }
        _ => panic!("표가 아니다"),
    }
}

#[test]
fn row_insert_delete_keeps_table_width() {
    let bytes = std::fs::read(SAMPLE).expect("fixture");
    let mut core = DocumentCore::from_bytes(&bytes).expect("파싱");
    let before = table_width(&core, 2);
    assert_eq!(before.0, 47625, "전제: 행마다 열 경계가 다른 표");
    core.insert_table_row_native(0, 2, 0, 1, true).expect("행 삽입");
    assert_eq!(table_width(&core, 2), before, "행 삽입 뒤 폭(common·raw)이 같아야 한다");
    core.delete_table_row_native(0, 2, 0, 2).expect("행 삭제");
    assert_eq!(table_width(&core, 2), before, "행 삭제 뒤에도 폭이 같아야 한다");
}
