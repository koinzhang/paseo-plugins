#!/usr/bin/env bash
# 刷新同级 Paseo 源码 checkout（只读参考）。
#
# 用法:
#   scripts/sync-paseo.sh            # 刷新 ../paseo（fetch + fast-forward）
#   scripts/sync-paseo.sh --clone    # 目录不存在时浅克隆（--depth 1 --filter=blob:none）
#   PASEO_DIR=/path/to/paseo scripts/sync-paseo.sh
#   PASEO_REMOTE=git@github.com:getpaseo/paseo.git PASEO_BRANCH=main scripts/sync-paseo.sh
#
# 只做 fetch / fast-forward：不提交、不改 paseo 工作副本内容、不动本仓库 jj 状态。
# 本仓库不把 Paseo 作为 git submodule（jj 不支持：内容不会出现在工作副本里）。
set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PASEO_DIR="${PASEO_DIR:-$(dirname -- "${REPO_ROOT}")/paseo}"
PASEO_REMOTE="${PASEO_REMOTE:-https://github.com/getpaseo/paseo.git}"
PASEO_BRANCH="${PASEO_BRANCH:-main}"
MANIFEST="${REPO_ROOT}/activity/paseo-plugin.json"

clone=false
for arg in "$@"; do
  case "${arg}" in
    --clone) clone=true ;;
    -h|--help) sed -n '2,11p' "${BASH_SOURCE[0]}" | sed -E 's/^# ?//'; exit 0 ;;
    *) echo "未知参数：${arg}（--help 查看用法）" >&2; exit 2 ;;
  esac
done

read_json() { # read_json <file> <dot.path>
  node -e '
    const fs = require("fs");
    const [file, path] = process.argv.slice(1);
    let v = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const k of path.split(".")) v = v == null ? v : v[k];
    process.stdout.write(v == null ? "" : String(v));
  ' "$1" "$2" 2>/dev/null || true
}

normalize_remote() { # 去掉 scheme / user / .git，便于比较不同写法
  printf '%s' "$1" | sed -E 's#^[a-zA-Z+]+://##; s#^[^@/]+@##; s#:#/#; s#\.git$##; s#/$##' \
    | tr '[:upper:]' '[:lower:]'
}

if [ ! -d "${PASEO_DIR}/.git" ]; then
  if [ "${clone}" = true ]; then
    echo "== 浅克隆 ${PASEO_REMOTE} (${PASEO_BRANCH}) → ${PASEO_DIR}"
    git clone --depth 1 --filter=blob:none --branch "${PASEO_BRANCH}" "${PASEO_REMOTE}" "${PASEO_DIR}"
  else
    cat >&2 <<EOF
未找到 Paseo checkout：${PASEO_DIR}

先克隆（浅克隆足够，只作只读参考）：
  git clone --depth 1 --filter=blob:none ${PASEO_REMOTE} "${PASEO_DIR}"

或运行：scripts/sync-paseo.sh --clone
（不用 submodule：jj 不支持，submodule 内容不会出现在工作副本里。）
EOF
    exit 1
  fi
fi

origin_url="$(git -C "${PASEO_DIR}" remote get-url origin 2>/dev/null || true)"
if [ "$(normalize_remote "${origin_url}")" != "$(normalize_remote "${PASEO_REMOTE}")" ]; then
  cat >&2 <<EOF
origin 与期望的上游不一致，跳过刷新：
  origin        ${origin_url}
  期望          ${PASEO_REMOTE}
若这是有意的 fork，用 PASEO_REMOTE=${origin_url} 重新运行。
EOF
  exit 1
fi

dirty="$(git -C "${PASEO_DIR}" status --porcelain --untracked-files=no)"
if [ -n "${dirty}" ]; then
  echo "paseo 工作副本有未提交改动，跳过刷新（避免覆盖）：" >&2
  printf '%s\n' "${dirty}" >&2
  exit 1
fi

echo "== fetch ${PASEO_BRANCH} @ ${PASEO_DIR}"
git -C "${PASEO_DIR}" fetch --prune origin "${PASEO_BRANCH}"

current_branch="$(git -C "${PASEO_DIR}" rev-parse --abbrev-ref HEAD)"
if [ "${current_branch}" = "${PASEO_BRANCH}" ]; then
  if ! git -C "${PASEO_DIR}" merge --ff-only --quiet "origin/${PASEO_BRANCH}"; then
    echo "无法 fast-forward（本地 ${PASEO_BRANCH} 与 origin/${PASEO_BRANCH} 分叉），请手动处理" >&2
    exit 1
  fi
else
  echo "当前分支 ${current_branch} ≠ ${PASEO_BRANCH}，只 fetch 不移动 HEAD" >&2
fi

head_sha="$(git -C "${PASEO_DIR}" rev-parse --short HEAD)"
head_date="$(git -C "${PASEO_DIR}" log -1 --format=%cs)"
head_subject="$(git -C "${PASEO_DIR}" log -1 --format=%s)"
upstream_version="$(read_json "${PASEO_DIR}/package.json" version)"
ahead="$(git -C "${PASEO_DIR}" rev-list --count "origin/${PASEO_BRANCH}..HEAD" 2>/dev/null || echo '?')"
behind="$(git -C "${PASEO_DIR}" rev-list --count "HEAD..origin/${PASEO_BRANCH}" 2>/dev/null || echo '?')"
cli_version="$(paseo --version 2>/dev/null | head -1 || true)"
requirement="$(read_json "${MANIFEST}" requirements.paseo)"

cat <<EOF

== 上游源码
   路径      ${PASEO_DIR}
   分支      ${current_branch}（target ${PASEO_BRANCH}；相对 origin/${PASEO_BRANCH}：ahead ${ahead} / behind ${behind}）
   HEAD      ${head_sha}  ${head_date}  ${head_subject}
   版本      ${upstream_version:-?}

== 运行时契约
   paseo CLI           ${cli_version:-（未安装）}
   requirements.paseo  ${requirement:-（缺失）}
EOF

# 锚点只在该 checkout 正好等于 origin/<branch> 时可信：否则 HEAD 不是上游提交。
if [ "${current_branch}" != "${PASEO_BRANCH}" ]; then
  cat >&2 <<EOF

当前不在 ${PASEO_BRANCH} 分支，HEAD 不代表上游 ${PASEO_BRANCH}；不给出锚点。
需要锚点时切回：git -C "${PASEO_DIR}" switch ${PASEO_BRANCH}
EOF
  exit 1
fi

if [ "${ahead}" != 0 ]; then
  cat >&2 <<EOF

该 checkout 有 ${ahead} 个不在 origin/${PASEO_BRANCH} 上的本地提交（HEAD ${head_sha} 不是上游提交），不给出锚点。
查看：git -C "${PASEO_DIR}" log --oneline origin/${PASEO_BRANCH}..HEAD
不要用这里的 commit 作为 research.md 锚点；需要干净参考时另克隆一份。
EOF
  exit 1
fi

cat <<EOF

== 写进 specs/00N/research.md 的锚点（复制即用）
- 上游源码锚点：\`${head_sha}\`（paseo ${upstream_version:-?} · ${PASEO_BRANCH} · ${head_date}）
- 运行时：\`paseo --version\` = ${cli_version:-?}；\`requirements.paseo\` = ${requirement:-?}
EOF
