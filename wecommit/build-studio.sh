#!/usr/bin/env bash
#
# build-studio.sh — wecommit-ai/rhwp 포크의 핀 커밋으로 rhwp-studio 번들(wasm + JS + 폰트)을 만든다.
# L1 SSOT(BAC-1845 P1, 결정 301·306). genDOC scripts/rhwp/build-studio.sh 를 옮겨 왔다.
#
# 패치는 .patch 파일이 아니라 포크 브랜치 wecommit/v0.8.7 의 커밋이다(패치 하나 = 커밋 하나).
# 업데이트: 그 브랜치에 커밋을 얹고 RHWP_PIN 을 새 커밋 sha 로 바꾼 뒤 다시 실행한다.
#
# 선행 도구: rustup(+ rust-toolchain.toml 의 1.93.1·wasm32 타깃), wasm-pack, node/npm.
#
# 사용 (포크 체크아웃 안에서):
#   wecommit/build-studio.sh                          # wecommit/.build/src 에 핀 worktree → wecommit/.build/rhwp-studio
#   RHWP_SRC=~/rhwp OUT=/tmp/studio wecommit/build-studio.sh   # 다른 소스 디렉터리·출력 위치
# 출력 옆에 <OUT>.sha256 (파일별 sha256) 을 남긴다. 받는 쪽(genDOC 등)은 이것으로 바이트 일치를 확인한다.
#
set -euo pipefail

# ── 핀 (업데이트 시 이 줄만 바꾼다) ────────────────────────────────────
# wecommit/v0.8.7 = upstream v0.8.7(1a76570e) + genDOC 패치 0001~0017
RHWP_PIN="e70346da00fd5480889403427848a818a1fb8f9e"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
RHWP_SRC="${RHWP_SRC:-$SCRIPT_DIR/.build/src}"
OUT="${OUT:-$SCRIPT_DIR/.build/rhwp-studio}"
export GIT_LFS_SKIP_SMUDGE=1

echo "▶ rhwp 소스: $RHWP_SRC  (pin $RHWP_PIN)"

# ── 1. 핀 커밋 확보 + 깨끗한 체크아웃 ───────────────────────────────────
git -C "$REPO_ROOT" cat-file -e "$RHWP_PIN^{commit}" 2>/dev/null \
  || git -C "$REPO_ROOT" fetch --quiet origin "$RHWP_PIN"
if [ ! -e "$RHWP_SRC/.git" ]; then
  git -C "$REPO_ROOT" worktree add --quiet --no-checkout --detach "$RHWP_SRC" "$RHWP_PIN"
  git -C "$RHWP_SRC" sparse-checkout set --no-cone '/*' '!/pdf/'   # pdf/(1.3GB)는 빌드에 안 쓴다
fi
git -C "$RHWP_SRC" checkout -f --quiet --detach "$RHWP_PIN"
git -C "$RHWP_SRC" reset --hard --quiet "$RHWP_PIN"
git -C "$RHWP_SRC" clean -fdq -e node_modules -e target -e pkg -e dist
[ "$(git -C "$RHWP_SRC" rev-parse HEAD)" = "$RHWP_PIN" ] || { echo "✖ HEAD ≠ 핀"; exit 1; }

# ── 2. wasm 빌드 → rhwp-studio 가 import 하는 ../pkg ────────────────────
echo "▶ wasm-pack build --release"
( cd "$RHWP_SRC" && wasm-pack build --target web --release )

# ── 3. rhwp-studio 빌드 (base=/rhwp-studio/ — iframe 서빙 경로) ─────────
echo "▶ rhwp-studio build"
( cd "$RHWP_SRC/rhwp-studio" && npm ci --no-audit --no-fund && npm run build -- --base=/rhwp-studio/ )
DIST="$RHWP_SRC/rhwp-studio/dist"

# ── 4. dist → OUT (PWA service worker 제외) ────────────────────────────
echo "▶ copy → $OUT"
rm -rf "$OUT"
mkdir -p "$OUT"
rsync -a \
  --exclude 'rhwp.d.ts' --exclude 'rhwp.js' \
  --exclude 'sw.js' --exclude 'workbox-*.js' --exclude 'registerSW.js' --exclude 'manifest.webmanifest' \
  "$DIST"/ "$OUT"/
perl -0pi -e 's{<link rel="manifest"[^>]*>}{}g; s{<script[^>]*vite-plugin-pwa:register-sw[^>]*></script>}{}g' "$OUT/index.html"

# ── 5. 폰트 트리밍 — 핵심 한국어 폰트만 ─────────────────────────────────
# [genDOC BAC-1656] D2Coding 은 남긴다: 굴림체·바탕체·돋움체(고정폭) 대체 글꼴(font-loader.ts).
( cd "$OUT/fonts" && rm -f \
    Cafe24Ssurround-v2.0.woff2 Cafe24Supermagic-Regular-v1.0.woff2 \
    Happiness-Sans-Bold.woff2 Happiness-Sans-Regular.woff2 Happiness-Sans-Title.woff2 HappinessSansVF.woff2 \
    LatinModernMath-Regular.woff2 \
    NanumGothicCoding-Bold.woff2 NanumGothicCoding-Regular.woff2 \
    Pretendard-Black.woff2 Pretendard-ExtraBold.woff2 Pretendard-ExtraLight.woff2 Pretendard-Thin.woff2 \
    2>/dev/null || true )

# ── 6. 검증용 샘플만 남긴다 (biz_plan.hwp / form-002.hwpx) ──────────────
if [ -d "$OUT/samples" ]; then
  ( cd "$OUT/samples" && find . -type f ! -name 'biz_plan.hwp' ! -name 'form-002.hwpx' -delete )
fi

# ── 7. 파일별 sha256 ───────────────────────────────────────────────────
( cd "$OUT" && find . -type f | LC_ALL=C sort | xargs shasum -a 256 ) > "$OUT.sha256"

echo "✔ done. $(du -sh "$OUT" | cut -f1) → $OUT  (pin $RHWP_PIN)"
echo "  sha256: $OUT.sha256  (bundle $(shasum -a 256 "$OUT.sha256" | cut -c1-12))"
