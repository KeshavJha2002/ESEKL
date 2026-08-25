/**
 * Git History & Bug Fix Archaeologist
 *
 * Extracts historical bug fixes, race condition fixes, regressions, and CVE mitigations
 * from a target git repository.
 */

import { execSync } from "node:child_process";

export interface BugFixRecord {
  commitHash: string;
  authorDate: string;
  subject: string;
  body: string;
  issueRefs: string[];
  touchedFiles: string[];
  fixCategory: "crash" | "race_condition" | "memory_leak" | "timeout" | "deadlock" | "data_corruption" | "retry_storm" | "other";
}

export function extractBugFixHistory(repoPath: string, limit = 250): BugFixRecord[] {
  try {
    const gitLogCmd = `git -C "${repoPath}" log -n ${limit} --grep="fix" --grep="bug" --grep="issue" --grep="crash" --grep="deadlock" --grep="race" --grep="leak" --grep="timeout" -i --pretty=format:"COMMIT_SEP%n%H%n%aI%n%s%n%b%n---DIFF_STAT---" --name-only`;
    const rawLog = execSync(gitLogCmd, { encoding: "utf8", maxBuffer: 15 * 1024 * 1024 });

    const entries = rawLog.split("COMMIT_SEP\n").filter(Boolean);
    const results: BugFixRecord[] = [];

    for (const entry of entries) {
      const lines = entry.trim().split("\n");
      if (lines.length < 3) continue;
      const commitHash = lines[0].trim();
      const authorDate = lines[1].trim();
      const subject = lines[2].trim();

      const diffStatIndex = lines.indexOf("---DIFF_STAT---");
      const body = diffStatIndex > 3 ? lines.slice(3, diffStatIndex).join("\n").trim() : "";
      const touchedFiles = diffStatIndex !== -1 ? lines.slice(diffStatIndex + 1).map(l => l.trim()).filter(Boolean) : [];

      // Extract issue references e.g. #123, GH-456, fix #789
      const fullText = `${subject} ${body}`;
      const issueMatches = fullText.match(/#\d+|GH-\d+|(?:fixes|closes|resolves|refs)\s+#?\d+/gi) || [];
      const issueRefs = Array.from(new Set(issueMatches.map(m => m.trim())));

      // Categorize fix
      let fixCategory: BugFixRecord["fixCategory"] = "other";
      const lower = fullText.toLowerCase();
      if (lower.includes("race") || lower.includes("data race") || lower.includes("racy")) fixCategory = "race_condition";
      else if (lower.includes("deadlock") || lower.includes("lock inversion") || lower.includes("hang")) fixCategory = "deadlock";
      else if (lower.includes("crash") || lower.includes("panic") || lower.includes("nil pointer") || lower.includes("segfault")) fixCategory = "crash";
      else if (lower.includes("leak") || lower.includes("oom") || lower.includes("unbounded")) fixCategory = "memory_leak";
      else if (lower.includes("timeout") || lower.includes("deadline")) fixCategory = "timeout";
      else if (lower.includes("corrupt") || lower.includes("data loss") || lower.includes("poison")) fixCategory = "data_corruption";
      else if (lower.includes("storm") || lower.includes("stampede") || lower.includes("cascade")) fixCategory = "retry_storm";

      results.push({
        commitHash,
        authorDate,
        subject,
        body,
        issueRefs,
        touchedFiles,
        fixCategory,
      });
    }

    return results;
  } catch (err) {
    console.error("Warning: Git history extraction failed:", (err as Error).message);
    return [];
  }
}
