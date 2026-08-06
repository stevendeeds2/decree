import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * @typedef {{ code: string, file: string, line?: number, message: string }} FindingLike
 * @typedef {{
 *   version: 1,
 *   findings: Array<{
 *     code: string,
 *     file: string,
 *     line?: number,
 *     messageFingerprint: string,
 *   }>,
 * }} BaselineFile
 */

/**
 * @param {string} message
 */
export function normalizeMessage(message) {
  return String(message ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Stable identity for a finding (line excluded).
 * @param {FindingLike} finding
 */
export function fingerprintFinding(finding) {
  const payload = [
    finding.code ?? '',
    finding.file ?? '',
    normalizeMessage(finding.message ?? ''),
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * @param {FindingLike[]} findings
 * @returns {BaselineFile}
 */
export function findingsToBaseline(findings) {
  return {
    version: 1,
    findings: findings.map((f) => ({
      code: f.code,
      file: f.file,
      line: f.line,
      messageFingerprint: fingerprintFinding(f),
    })),
  };
}

/**
 * @param {string} path
 * @returns {BaselineFile}
 */
export function loadBaseline(path) {
  if (!existsSync(path)) {
    throw new Error(`Baseline file not found: ${path}`);
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(
      `Invalid baseline JSON at ${path}: ${err instanceof Error ? err.message : err}`,
    );
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Baseline must be an object: ${path}`);
  }
  if (raw.version !== 1) {
    throw new Error(
      `Unsupported baseline version: ${String(raw.version)} (expected 1)`,
    );
  }
  if (!Array.isArray(raw.findings)) {
    throw new Error(`Baseline findings must be an array: ${path}`);
  }
  for (const entry of raw.findings) {
    if (!entry || typeof entry.messageFingerprint !== 'string') {
      throw new Error(`Baseline entry missing messageFingerprint: ${path}`);
    }
  }
  return /** @type {BaselineFile} */ (raw);
}

/**
 * @param {string} path
 * @param {BaselineFile} baseline
 */
export function writeBaseline(path, baseline) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
}

/**
 * @param {FindingLike[]} findings
 * @param {BaselineFile} baseline
 */
export function diffAgainstBaseline(findings, baseline) {
  const known = new Set(
    baseline.findings.map((f) => f.messageFingerprint).filter(Boolean),
  );
  /** @type {FindingLike[]} */
  const newFindings = [];
  /** @type {FindingLike[]} */
  const baselinedFindings = [];
  for (const f of findings) {
    const fp = fingerprintFinding(f);
    if (known.has(fp)) baselinedFindings.push(f);
    else newFindings.push(f);
  }
  return { newFindings, baselinedFindings };
}
