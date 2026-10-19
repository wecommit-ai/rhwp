# wecommit/ — rhwp 핀·패치·번들 빌드 (L1 SSOT)

위커밋 제품(genDOC 등)이 쓰는 rhwp-studio 번들은 **여기서만 만든다.** BAC-1845(P1 = BAC-1847), 결정 301·306.
genDOC `scripts/rhwp/`(build-studio.sh + patches/)에서 옮겨 왔다. genDOC가 이 번들을 받도록 바꾸는 일은 P2(BAC-1848)다.

| 무엇 | 어디 |
|---|---|
| 핀 | `build-studio.sh` 의 `RHWP_PIN` = 브랜치 `wecommit/v0.8.7` 커밋 sha |
| 패치 | `wecommit/v0.8.7` 의 커밋 (upstream v0.8.7 `1a76570e` 위, 패치 하나 = 커밋 하나) |
| 빌드 | `build-studio.sh` → `wecommit/.build/rhwp-studio/` + `rhwp-studio.sha256` (gitignore) |

## 패치 (wecommit/v0.8.7, `1a76570e..e70346da`)

`git log --reverse 1a76570e8..e70346da0` 순서가 패치 번호다. 내용은 genDOC `scripts/rhwp/patches/0001~0017` 과 같다.

| 번호 | 내용 |
|---|---|
| 0001 | 셀 끝 새 문단 추가(앵커 보존) + 셀 글자모양 상속 |
| 0002 | `getCellInfo.hasObject` |
| 0003 | `forceFullRelayout` + 늘어난 표 높이 되쓰기 |
| 0004 | 글자 서식 reflow 때 문단 vpos 유지 |
| 0005 | 그림보다 작은 LINE_SEG 의 글자처럼 그림 높이 |
| 0006 | 쪽나누기 앞 빈 문단 여럿 → 빈 쪽 방지 |
| 0007 | 줄 끝 `\n` 은 TAC 표 줄로 안 나눔 |
| 0008 | 빈 쪽보다 큰 TAC 표 행 분할 + stale 표 실측 쪽 나눔 |
| 0009 | HWP ID_MAPPINGS 변경 추적 개수·16필드·옛 산출물 재직렬화 |
| 0010 | HWPX `breakCellSeparateLine` 왕복 |
| 0011 | genDOC 호스트 RPC(embed `rpc-router` 확장) + 오버레이 |
| 0012 | host 저장 → 부모 + 로컬 내보내기 게이트 |
| 0013 | 임베드 beforeunload·dirty 브리지 + host 자동저장·빈 문서 끔 |
| 0014 | 차트 메뉴 + 도표 그림 더블클릭 |
| 0015 | 옛 genDOC 저장본의 낡은 표 프레임 보정 |
| 0016 | 함초롬 웹폰트를 기다리지 않고 열기 (BAC-2067) |
| 0017 | 호스트 RPC `deleteCellParagraphs` (FE-1652) |

옛 v0.7.12 패치(0001~0067)와의 대응·버린 패치 근거: genDOC `scripts/rhwp/README.md`, BAC-1856.

## 빌드

선행: rustup(`rust-toolchain.toml` 1.93.1 + wasm32), wasm-pack, node/npm. Homebrew rustup 은 keg-only 라 `cargo` 가 PATH 에 없을 수 있다.

```bash
export PATH="$(brew --prefix rustup)/bin:$PATH"
wecommit/build-studio.sh
```

핀 커밋을 `wecommit/.build/src` 에 worktree(pdf/ 제외)로 꺼내 wasm-pack → vite(`--base=/rhwp-studio/`) → PWA 제거·폰트 트리밍·샘플 정리 순으로 만든다.
`RHWP_SRC`·`OUT` 으로 위치를 바꿀 수 있다. GitHub Actions 는 11/1까지 꺼져 있어 지금은 로컬 빌드만 한다.

## 업데이트 절차

1. `wecommit/v0.8.7`(또는 새 upstream 기준 브랜치)에 패치를 커밋으로 얹는다. upstream 을 올릴 때는 새 태그 위로 rebase 한다.
2. `build-studio.sh` 의 `RHWP_PIN` 을 새 커밋 sha(40자)로 바꾼다.
3. 빌드하고, 받는 쪽(genDOC)에서 그 번들로 검증한 뒤 핀 변경을 머지한다. 받는 쪽은 `rhwp-studio.sha256` 으로 받은 파일이 빌드 결과와 같은지 확인한다.
