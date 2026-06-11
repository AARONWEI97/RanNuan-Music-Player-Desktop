use std::process::Command;
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

// ═══════════════ 托盘句柄状态（跨线程安全，用于动态更新 tooltip）═══════════════
struct TrayState {
    handle: Mutex<Option<tauri::tray::TrayIcon>>,
}

// ═══════════════ 下载路径 ═══════════════
fn get_downloads_dir() -> String {
    if cfg!(target_os = "windows") {
        let up = std::env::var("USERPROFILE").unwrap_or_default();
        format!("{}\\Downloads", up)
    } else {
        let home = std::env::var("HOME").unwrap_or_default();
        format!("{}/Downloads", home)
    }
}

#[tauri::command]
fn get_downloads_path() -> String {
    get_downloads_dir()
}

#[tauri::command]
fn open_downloads_folder() -> Result<(), String> {
    let path = get_downloads_dir();
    if cfg!(target_os = "windows") {
        Command::new("explorer").arg(&path).spawn().map_err(|e| e.to_string())?;
    } else if cfg!(target_os = "macos") {
        Command::new("open").arg(&path).spawn().map_err(|e| e.to_string())?;
    } else {
        Command::new("xdg-open").arg(&path).spawn().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ═══════════════ 托盘 tooltip 动态更新（前端调用） ═══════════════
#[tauri::command]
fn update_tray_tooltip(
    text: String,
    tray_state: State<TrayState>,
) -> Result<(), String> {
    if let Some(tray) = tray_state.handle.lock().unwrap().as_ref() {
        tray.set_tooltip(Some(&text)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ═══════════════ App 入口 ═══════════════
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_downloads_path,
            open_downloads_folder,
            update_tray_tooltip,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // ── 托盘菜单 ──
            // 设计参考 QQ音乐 / 网易云音乐托盘菜单布局
            // 注意：托盘菜单由操作系统原生渲染，无法用 CSS 自定义样式，
            //       只能通过 Unicode 图标 + 合理分组来优化视觉层次
            let title      = tauri::menu::MenuItem::with_id(app, "info",  "🎵  RanNuan Music", false, None::<&str>)?;
            let sep1       = tauri::menu::PredefinedMenuItem::separator(app)?;
            let play_pause = tauri::menu::MenuItem::with_id(app, "play_pause", "▶  播放 / 暂停", true, None::<&str>)?;
            let next_track = tauri::menu::MenuItem::with_id(app, "next", "⏭  下一首", true, None::<&str>)?;
            let prev_track = tauri::menu::MenuItem::with_id(app, "prev", "⏮  上一首", true, None::<&str>)?;
            let sep2       = tauri::menu::PredefinedMenuItem::separator(app)?;
            let show_i     = tauri::menu::MenuItem::with_id(app, "show", "▣  显示主窗口", true, None::<&str>)?;
            let quit_i     = tauri::menu::MenuItem::with_id(app, "quit", "✕  退出", true, None::<&str>)?;

            let menu = tauri::menu::Menu::with_items(
                app,
                &[&title, &sep1, &play_pause, &next_track, &prev_track, &sep2, &show_i, &quit_i],
            )?;

            let tray = tauri::tray::TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("RanNuan Music")
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "play_pause" => { let _ = app.emit("tray:play-pause", ()); }
                        "next"       => { let _ = app.emit("tray:next", ()); }
                        "prev"       => { let _ = app.emit("tray:prev", ()); }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    // ★ 只响应左键点击显示窗口，右键留给 OS 菜单
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // ★ 保存托盘句柄，供 update_tray_tooltip 命令使用
            app.manage(TrayState {
                handle: Mutex::new(Some(tray)),
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
