export type RGB = [number, number, number];

export interface StatusInput {
  workspace?: { current_dir?: string };
  cwd?: string;
  model?: { display_name?: string; id?: string };
  context_window?: { used_percentage?: number };
}

export interface UsageData {
  five_hour?: { utilization: number; resets_at: string };
  seven_day?: { utilization: number; resets_at: string };
}

export interface GitInfo {
  gitRoot: string;
  repoName: string;
  branch: string;
  dirty: "" | "*";
}
