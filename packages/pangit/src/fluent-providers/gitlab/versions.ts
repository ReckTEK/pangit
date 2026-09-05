export const versions = ["18.11.11", "19.3.1"] as const;
export type GitLabVersion = typeof versions[number];
