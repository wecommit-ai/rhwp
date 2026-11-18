//! 1×1 RowBreak 표 안에 중첩표가 여럿 든 서식이 한컴보다 한 쪽 더 나뉘는 결함 (BAC-2578).
//!
//! TIPS 총괄운영지침 별지서식(공개 문서) 「별지 제1-⑥호 팁스 투자계약 동의 및 합의서」 한 건만 잘라 낸
//! fixture. 한컴독스는 이 서식을 3쪽(본문 표 2쪽 + 꼬리 1쪽)에 담는데 rhwp 는 4쪽으로 나눈다.
//! 4쪽째 직전 쪽(2쪽)은 쪽의 26%만 쓰고 넘어간다.
#![cfg(not(target_arch = "wasm32"))]

use rhwp::DocumentCore;

const SAMPLE: &str =
    "samples/issue_nested_cell_split_1118/tips_form_1_6_single_cell_nested_tables.hwp";

#[test]
fn single_cell_rowbreak_table_with_nested_tables_matches_hancom_page_count() {
    let bytes = std::fs::read(SAMPLE).expect("fixture 를 읽을 수 있어야 한다");
    let core = DocumentCore::from_bytes(&bytes).expect("fixture 파싱");
    assert_eq!(core.page_count(), 3, "한컴독스 기준 3쪽");
}
