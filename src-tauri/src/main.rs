use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::Duration;
use tauri::{Manager, State};
use walkdir::WalkDir;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};

pub struct AppState {
    pub watcher: Option<RecommendedWatcher>,
    pub watched_path: Option<PathBuf>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct MarkdownFile {
    pub path: String,
    pub relative_path: String,
    pub name: String,
    pub content: String,
    pub metadata: HashMap<String, serde_json::Value>,
    pub depth: usize,
    pub parent_dir: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct DirectoryTree {
    pub name: String,
    pub path: String,
    pub relative_path: String,
    pub children: Vec<DirectoryTree>,
    pub files: Vec<MarkdownFile>,
    pub depth: usize,
}

#[tauri::command]
fn open_folder(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    let result = tauri::api::dialog::blocking::FileDialogBuilder::new()
        .set_title("Select Documentation Folder")
        .pick_folder();

    if let Some(path) = result {
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

fn read_markdown_files(root_path: &PathBuf) -> Vec<MarkdownFile> {
    let mut files = Vec::new();

    for entry in WalkDir::new(root_path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();

        if let Some(ext) = path.extension() {
            if ext == "md" || ext == "mdx" || ext == "markdown" {
                if let Ok(content) = fs::read_to_string(path) {
                    let relative = path
                        .strip_prefix(root_path)
                        .unwrap_or(path)
                        .to_string_lossy()
                        .to_string();

                    let name = path
                        .file_stem()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();

                    let depth = relative.matches(std::path::MAIN_SEPARATOR).count();

                    let parent = path
                        .parent()
                        .and_then(|p| p.file_name())
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();

                    let metadata = extract_frontmatter(&content);

                    files.push(MarkdownFile {
                        path: path.to_string_lossy().to_string(),
                        relative_path: relative,
                        name,
                        content,
                        metadata,
                        depth,
                        parent_dir: parent,
                    });
                }
            }
        }
    }

    files
}

fn extract_frontmatter(content: &str) -> HashMap<String, serde_json::Value> {
    let mut metadata = HashMap::new();

    if content.starts_with("---") {
        if let Some(end) = content[3..].find("---") {
            let fm = &content[3..end + 3];
            for line in fm.lines() {
                let line = line.trim();
                if line.is_empty() || line.starts_with('#') {
                    continue;
                }
                if let Some((key, value)) = line.split_once(':') {
                    let key = key.trim().to_string();
                    let value = value.trim().to_string();

                    let parsed = if value.starts_with('[') && value.ends_with(']') {
                        let items: Vec<serde_json::Value> = value[1..value.len() - 1]
                            .split(',')
                            .map(|s| serde_json::Value::String(s.trim().trim_matches('"').to_string()))
                            .collect();
                        serde_json::Value::Array(items)
                    } else if value == "true" {
                        serde_json::Value::Bool(true)
                    } else if value == "false" {
                        serde_json::Value::Bool(false)
                    } else if let Ok(n) = value.parse::<i64>() {
                        serde_json::Value::Number(n.into())
                    } else {
                        serde_json::Value::String(value.trim_matches('"').to_string())
                    };

                    metadata.insert(key, parsed);
                }
            }
        }
    }

    metadata
}

#[tauri::command]
fn scan_directory(path: String) -> Result<ScanResult, String> {
    let root = PathBuf::from(&path);
    if !root.exists() || !root.is_dir() {
        return Err("Invalid directory path".into());
    }

    let files = read_markdown_files(&root);
    let tree = build_directory_tree(&root, &root);

    Ok(ScanResult { files, tree })
}

#[derive(serde::Serialize)]
struct ScanResult {
    files: Vec<MarkdownFile>,
    tree: DirectoryTree,
}

fn build_directory_tree(root: &PathBuf, current: &PathBuf) -> DirectoryTree {
    let name = current
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let relative = current
        .strip_prefix(root)
        .unwrap_or(current)
        .to_string_lossy()
        .to_string();

    let depth = relative.matches(std::path::MAIN_SEPARATOR).count();

    let mut children = Vec::new();
    let mut files = Vec::new();

    if let Ok(entries) = fs::read_dir(current) {
        let mut dirs: Vec<_> = entries.filter_map(|e| e.ok()).collect();
        dirs.sort_by_key(|e| e.file_name());

        for entry in dirs {
            let entry_path = entry.path();
            if entry_path.is_dir() {
                let child = build_directory_tree(root, &entry_path);
                if !child.files.is_empty() || !child.children.is_empty() {
                    children.push(child);
                }
            } else if let Some(ext) = entry_path.extension() {
                if ext == "md" || ext == "mdx" || ext == "markdown" {
                    if let Ok(content) = fs::read_to_string(&entry_path) {
                        let rel = entry_path
                            .strip_prefix(root)
                            .unwrap_or(&entry_path)
                            .to_string_lossy()
                            .to_string();

                        let file_name = entry_path
                            .file_stem()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string();

                        let parent = entry_path
                            .parent()
                            .and_then(|p| p.file_name())
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string();

                        let file_depth = rel.matches(std::path::MAIN_SEPARATOR).count();
                        let metadata = extract_frontmatter(&content);

                        files.push(MarkdownFile {
                            path: entry_path.to_string_lossy().to_string(),
                            relative_path: rel,
                            name: file_name,
                            content,
                            metadata,
                            depth: file_depth,
                            parent_dir: parent,
                        });
                    }
                }
            }
        }
    }

    DirectoryTree {
        name,
        path: current.to_string_lossy().to_string(),
        relative_path: relative,
        children,
        files,
        depth,
    }
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn start_watcher(
    app_handle: tauri::AppHandle,
    path: String,
    _state: State<'_, AppState>,
) -> Result<(), String> {
    let watch_path = PathBuf::from(&path);
    if !watch_path.exists() {
        return Err("Path does not exist".into());
    }

    let (tx, rx) = mpsc::channel();

    let mut watcher: RecommendedWatcher =
        notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = tx.send(event);
            }
        })
        .map_err(|e| e.to_string())?;

    watcher
        .watch(&watch_path, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    let handle = app_handle.clone();
    std::thread::spawn(move || {
        while let Ok(event) = rx.recv_timeout(Duration::from_millis(500)) {
            let paths: Vec<String> = event
                .paths
                .iter()
                .map(|p| p.to_string_lossy().to_string())
                .collect();

            if !paths.is_empty() {
                let _ = handle.emit_all("fs-change", &paths);
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn open_in_editor(path: String) -> Result<(), String> {
    open::that(&path).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            watcher: None,
            watched_path: None,
        })
        .invoke_handler(tauri::generate_handler![
            open_folder,
            scan_directory,
            read_file,
            start_watcher,
            open_in_editor,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
