/** Keep Unicode letters (e.g. CJK titles) while stripping OS-illegal filename characters. */
export const safeFilename = (value: string): string =>
  (value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").replaceAll(/-+/g, "-").replaceAll(/^-|-$/g, "")
    || "olap-cube");
