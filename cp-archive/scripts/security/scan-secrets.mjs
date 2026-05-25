#!/usr/bin/env node
/**
 * scan-secrets.mjs
 *
 * 敏感信息扫描脚本 - 在 git pre-commit hook 中调用
 *
 * 用途：
 *   扫描 git staged 文件，检测是否包含 API Key、密码、Token 等敏感信息。
 *   发现问题时打印详细位置并以非零退出码中止提交。
 *
 * 使用方式：
 *   node scripts/security/scan-secrets.mjs          # 扫描 staged 文件
 *   node scripts/security/scan-secrets.mjs --all    # 扫描整个项目（CI 用）
 *
 * 设计原则：
 *   - 零外部依赖，仅用 Node.js 内置模块
 *   - 规则集中在 RULES 数组，易于扩展
 *   - 白名单机制避免误报（example 文件、注释示例等）
 */

import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, extname } from 'node:path'

// ── 扫描规则 ────────────────────────────────────────────
const RULES = [
  // JWT / Generic Secrets
  {
    id:      'generic-secret',
    name:    'Generic secret / password assignment',
    pattern: /(?:secret|password|passwd|pwd|api[_-]?key|access[_-]?key|auth[_-]?token)\s*[:=]\s*["'](?!<[^>]+>)[^"']{8,}/gi,
    severity: 'HIGH',
  },
  // Neon / PostgreSQL connection string with credentials
  {
    id:      'postgres-url',
    name:    'PostgreSQL connection URL with credentials',
    pattern: /postgresql:\/\/[^:]+:[^@]{4,}@/gi,
    severity: 'CRITICAL',
  },
  // Redis connection string with auth token
  {
    id:      'redis-url',
    name:    'Redis URL with auth token',
    pattern: /rediss?:\/\/[^:]+:[A-Za-z0-9+/=]{8,}@/gi,
    severity: 'CRITICAL',
  },
  // AWS keys
  {
    id:      'aws-access-key',
    name:    'AWS Access Key ID',
    pattern: /(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])/g,
    severity: 'HIGH',
  },
  {
    id:      'aws-secret',
    name:    'AWS Secret Access Key',
    pattern: /(?:aws[_-]?secret|aws[_-]?access)\s*[:=]\s*["']?[A-Za-z0-9/+]{40}["']?/gi,
    severity: 'HIGH',
  },
  // Private keys
  {
    id:      'private-key',
    name:    'Private key header',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: 'CRITICAL',
  },
  // Generic high-entropy tokens (e.g., Upstash, GitHub PAT)
  {
    id:      'upstash-token',
    name:    'Upstash Redis Token',
    pattern: /[A-Za-z0-9]{40,}/g,
    severity: 'MEDIUM',
    // 高熵串过滤：仅在出现在赋值上下文中时告警
    requireContext: /(?:token|key|secret|password|url|auth)\s*[:=]/i,
  },
  // GitHub / GitLab tokens
  {
    id:      'github-pat',
    name:    'GitHub Personal Access Token',
    pattern: /ghp_[A-Za-z0-9]{36}/g,
    severity: 'CRITICAL',
  },
  {
    id:      'github-oauth',
    name:    'GitHub OAuth Token',
    pattern: /gho_[A-Za-z0-9]{36}/g,
    severity: 'CRITICAL',
  },
]

// ── 白名单（文件路径包含以下字符串则跳过）─────────────
const PATH_ALLOWLIST = [
  '.env.example',
  '.env.template',
  'scan-secrets.mjs',     // 本脚本自身
  'CHANGELOG',
  'README',
  // 测试文件可以包含假凭据
  '.test.',
  '.spec.',
  '__tests__',
]

// ── 内容白名单（行包含以下字符串则跳过该行）──────────
const LINE_ALLOWLIST = [
  'example.com',
  'yourpassword',
  'your_password',
  'your-secret',
  '<YOUR_',
  'changeme',
  'placeholder',
  'TODO',
  '# ',              // 注释行（bash/yaml）
  '// ',             // 注释行（JS/TS）
  '* ',              // JSDoc
  'postgresql://user:password@',
  'postgresql://cpuser:yourpassword',
  'postgresql://cpuser:${',   // Docker Compose 环境变量占位符
  'redis://localhost',
  'dev-secret-change-in-production',
  'dev-refresh-secret-change-in-production',
  'invalidhashfortiming',  // 我们代码中的 DUMMY_HASH
]

// ── 跳过的文件类型 ─────────────────────────────────────
const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.pdf', '.zip', '.gz', '.tar', '.lock',
  '.woff', '.woff2', '.ttf', '.eot',
])

// ── 工具函数 ───────────────────────────────────────────
function isAllowlisted(filePath) {
  return PATH_ALLOWLIST.some(p => filePath.includes(p))
}

function isLineAllowlisted(line) {
  return LINE_ALLOWLIST.some(w => line.includes(w))
}

function shouldSkipFile(filePath) {
  const ext = extname(filePath).toLowerCase()
  return SKIP_EXTENSIONS.has(ext)
}

function scanContent(filePath, content) {
  const findings = []
  const lines = content.split('\n')

  for (const rule of RULES) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (isLineAllowlisted(line)) continue

      // requireContext 规则：检查前后 2 行是否有关键词上下文
      if (rule.requireContext) {
        const ctx = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).join('\n')
        if (!rule.requireContext.test(ctx)) continue
      }

      rule.pattern.lastIndex = 0
      const match = rule.pattern.exec(line)
      if (match) {
        // 截断显示，避免把真实 secret 打满屏
        const snippet = match[0].slice(0, 20) + (match[0].length > 20 ? '…' : '')
        findings.push({
          rule:     rule.id,
          name:     rule.name,
          severity: rule.severity,
          file:     filePath,
          line:     i + 1,
          snippet,
        })
      }
    }
  }

  return findings
}

// ── 获取待扫描文件列表 ─────────────────────────────────
function getGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim()
  } catch {
    return process.cwd()
  }
}

function getStagedFiles() {
  try {
    const output = execSync('git --no-pager diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8',
    }).trim()
    return output ? output.split('\n').filter(Boolean) : []
  } catch {
    return []
  }
}

function getAllProjectFiles() {
  try {
    const output = execSync('git --no-pager ls-files', {
      encoding: 'utf8',
    }).trim()
    return output ? output.split('\n').filter(Boolean) : []
  } catch {
    return []
  }
}

// ── 主流程 ─────────────────────────────────────────────
const args = process.argv.slice(2)
const scanAll = args.includes('--all')

const gitRoot = getGitRoot()  // 文件路径相对于 Git 根目录
const files = scanAll ? getAllProjectFiles() : getStagedFiles()

if (files.length === 0) {
  console.log('[SecretScan] No files to scan.')
  process.exit(0)
}

console.log(`[SecretScan] Scanning ${files.length} file(s)…`)

const allFindings = []

for (const relPath of files) {
  if (isAllowlisted(relPath) || shouldSkipFile(relPath)) continue

  // 文件路径相对于 Git 根目录（不是脚本的 cwd）
  const absPath = resolve(gitRoot, relPath)
  if (!existsSync(absPath)) continue

  let content
  try {
    content = readFileSync(absPath, 'utf8')
  } catch {
    continue // binary or unreadable
  }

  const findings = scanContent(relPath, content)
  allFindings.push(...findings)
}

if (allFindings.length === 0) {
  console.log('[SecretScan] ✅ No secrets detected.')
  process.exit(0)
}

// ── 输出告警 ───────────────────────────────────────────
console.error('\n[SecretScan] 🚨 POTENTIAL SECRETS DETECTED — commit blocked!\n')
console.error('  Fix the issues below, then re-stage and commit.\n')

for (const f of allFindings) {
  console.error(`  [${f.severity}] ${f.rule}: ${f.name}`)
  console.error(`    File: ${f.file}:${f.line}`)
  console.error(`    Match: "${f.snippet}"`)
  console.error()
}

console.error(`  Total findings: ${allFindings.length}`)
console.error('\n  If this is a false positive, add the pattern to LINE_ALLOWLIST in')
console.error('  scripts/security/scan-secrets.mjs, or use:')
console.error('    git commit --no-verify   (ONLY for verified false positives)')
console.error()

process.exit(1)
