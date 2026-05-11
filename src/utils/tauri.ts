export function isTauri(): boolean {
  return !!(window as any).__TAURI__;
}

export async function openFolderDialog(): Promise<string | null> {
  if (!isTauri()) {
    return null;
  }

  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke<string | null>("open_folder");
}

export async function scanDirectory(path: string): Promise<any> {
  if (!isTauri()) {
    return null;
  }

  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("scan_directory", { path });
}

export async function readFile(path: string): Promise<string | null> {
  if (!isTauri()) {
    return null;
  }

  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke<string>("read_file", { path });
}

export async function openInEditor(path: string): Promise<void> {
  if (!isTauri()) {
    return;
  }

  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("open_in_editor", { path });
}

export async function startFileWatcher(path: string): Promise<void> {
  if (!isTauri()) {
    return;
  }

  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("start_watcher", { path });
}
