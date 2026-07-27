use std::process::Command;
use std::sync::Mutex;
use tauri::{Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder, WindowEvent};

// ═══════════════ 副窗口标签 ═══════════════
const PANEL_LABEL: &str = "tray-panel";
const LYRICS_LABEL: &str = "lyrics";

// 面板尺寸（逻辑像素）。外围留透明 padding 给 CSS 阴影，所以比视觉尺寸略大。
// 面板会在队列展开时自行 setSize 到 PANEL_H_EXPANDED，这里只需给出初始高度。
const PANEL_W: f64 = 340.0;
const PANEL_H: f64 = 380.0;
const PANEL_GAP: f64 = 8.0; // 面板与托盘/屏幕边缘的间距

const LYRICS_W: f64 = 700.0;
const LYRICS_H: f64 = 200.0;

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

// ═══════════════ 主窗口显示 / 退出（面板按钮调用） ═══════════════
fn reveal_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    // 面板自身先收起，避免遮挡刚恢复的主窗口
    if let Some(panel) = app.get_webview_window(PANEL_LABEL) {
        let _ = panel.hide();
    }
    notify_viewers(&app);
    reveal_main_window(&app);
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

// ═══════════════ 托盘面板窗口 ═══════════════

/// 预创建面板窗口（隐藏状态）。在 setup 中调用，避免首次右键时等待 webview 冷启动。
fn create_panel_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    WebviewWindowBuilder::new(
        app,
        PANEL_LABEL,
        WebviewUrl::App("index.html#tray-panel".into()),
    )
    .title("RanNuan Music")
    .inner_size(PANEL_W, PANEL_H)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .minimizable(false)
    .maximizable(false)
    .visible(false)
    .focused(false)
    .build()?;
    if let Some(w) = app.get_webview_window(PANEL_LABEL) {
        eprintln!("[diag] panel url = {:?}", w.url().map(|u| u.to_string()));
    }
    Ok(())
}

/// 通知主窗口当前有几个副窗口可见。
///
/// 主窗口据此决定是否广播播放快照 —— 没人在看时不发，避免播放期间
/// 每秒数次无谓的 IPC。Rust 端查询真实窗口可见性，是唯一权威来源。
fn notify_viewers(app: &tauri::AppHandle) {
    let visible = [PANEL_LABEL, LYRICS_LABEL]
        .iter()
        .filter(|label| {
            app.get_webview_window(label)
                .and_then(|w| w.is_visible().ok())
                .unwrap_or(false)
        })
        .count();
    let _ = app.emit("panel:viewers", visible);
}

/// 根据托盘图标的屏幕矩形计算面板位置，并钳制在显示器工作区内。
///
/// 用 `work_area` 而非 `size`：工作区已排除任务栏，因此任务栏无论停靠在
/// 上/下/左/右，面板都不会被压到它底下。
fn position_panel(
    app: &tauri::AppHandle,
    panel: &tauri::WebviewWindow,
    tray_rect: Option<tauri::PhysicalPosition<f64>>,
) {
    let scale = panel
        .scale_factor()
        .unwrap_or(1.0);

    // 面板会随队列展开自行 setSize，所以读实际尺寸而非常量，
    // 否则展开状态下再次打开会算错位置。
    let (panel_w_phys, panel_h_phys) = match panel.outer_size() {
        Ok(sz) if sz.width > 0 && sz.height > 0 => (sz.width as f64, sz.height as f64),
        _ => (PANEL_W * scale, PANEL_H * scale),
    };
    let gap_phys = PANEL_GAP * scale;

    // 托盘位置未知时退回主显示器右下角
    let anchor = tray_rect.unwrap_or(tauri::PhysicalPosition { x: 0.0, y: 0.0 });

    let monitor = app
        .monitor_from_point(anchor.x, anchor.y)
        .ok()
        .flatten()
        .or_else(|| app.primary_monitor().ok().flatten());

    let (wa_x, wa_y, wa_w, wa_h) = match &monitor {
        Some(m) => {
            let a = m.work_area();
            (
                a.position.x as f64,
                a.position.y as f64,
                a.size.width as f64,
                a.size.height as f64,
            )
        }
        None => (0.0, 0.0, 1920.0, 1080.0),
    };

    // 水平：以托盘图标为中心；无锚点则贴工作区右侧
    let mut x = if tray_rect.is_some() {
        anchor.x - panel_w_phys / 2.0
    } else {
        wa_x + wa_w - panel_w_phys - gap_phys
    };

    // 垂直：托盘在工作区下半部分 → 面板向上弹；否则向下弹（任务栏在顶部的情况）
    let tray_in_lower_half = anchor.y > wa_y + wa_h / 2.0;
    let mut y = if tray_rect.is_none() {
        wa_y + wa_h - panel_h_phys - gap_phys
    } else if tray_in_lower_half {
        anchor.y - panel_h_phys - gap_phys
    } else {
        anchor.y + gap_phys
    };

    // 钳制到工作区内
    x = x.clamp(wa_x + gap_phys, (wa_x + wa_w - panel_w_phys - gap_phys).max(wa_x));
    y = y.clamp(wa_y + gap_phys, (wa_y + wa_h - panel_h_phys - gap_phys).max(wa_y));

    let _ = panel.set_position(tauri::PhysicalPosition {
        x: x.round() as i32,
        y: y.round() as i32,
    });
}

/// 右键托盘：切换面板显隐
fn toggle_tray_panel(app: &tauri::AppHandle, tray_pos: Option<tauri::PhysicalPosition<f64>>) {
    let Some(panel) = app.get_webview_window(PANEL_LABEL) else {
        // 面板不存在（创建失败）→ 回退：直接恢复主窗口，用户至少不会失去入口
        reveal_main_window(app);
        return;
    };

    if panel.is_visible().unwrap_or(false) {
        let _ = panel.hide();
        notify_viewers(app);
        return;
    }

    position_panel(app, &panel, tray_pos);

    // 面板可能被 WebView2 后台节流，show 前重新索要一次全量状态
    let _ = app.emit("panel:request-state", ());

    let _ = panel.show();
    let _ = panel.set_focus();
    notify_viewers(app);
}

// ═══════════════ 桌面歌词窗口 ═══════════════

/// 与 create_panel_window 相同思路：在 setup 阶段预创建歌词窗口（隐藏）。
///
/// 不能在用户点击时动态创建：Windows 上运行时动态创建第二个 WebView2 窗口
/// 会触发 Chrome_WidgetWin_0 类注册冲突（Error 1411），导致创建失败或崩溃。
/// setup 阶段统一预创建就不会有这个问题。
fn create_lyrics_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    let win = WebviewWindowBuilder::new(
        app,
        LYRICS_LABEL,
        WebviewUrl::App("index.html#lyrics".into()),
    )
    .title("桌面歌词")
    .inner_size(LYRICS_W, LYRICS_H)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .minimizable(false)
    .maximizable(false)
    .focusable(false)   // WS_EX_NOACTIVATE：永不抢焦点
    .visible(false)
    .focused(false)
    .build()?;

    // 默认摆在主显示器工作区底部居中
    if let Ok(Some(m)) = app.primary_monitor() {
        let a = m.work_area();
        let scale = win.scale_factor().unwrap_or(1.0);
        let w = LYRICS_W * scale;
        let h = LYRICS_H * scale;
        let x = a.position.x as f64 + (a.size.width as f64 - w) / 2.0;
        let y = a.position.y as f64 + a.size.height as f64 - h - 60.0 * scale;
        let _ = win.set_position(tauri::PhysicalPosition {
            x: x.round() as i32,
            y: y.round() as i32,
        });
    }

    // 创建时立即设置穿透，隐藏状态下设置比显示后更稳定
    let _ = win.set_ignore_cursor_events(true);
    eprintln!("[lyrics] 歌词窗口预创建完成");
    Ok(())
}

/// 强制设置歌词窗口穿透（show 前后各调用一次，防止时序覆盖）。
fn force_lyrics_passthrough(win: &tauri::WebviewWindow) {
    for _ in 0..3 {
        let _ = win.set_ignore_cursor_events(true);
    }
}

#[tauri::command]
fn open_lyrics_window(app: tauri::AppHandle) -> Result<(), String> {
    // 窗口在 setup 中已预创建，这里只做 show，不做创建
    let win = app
        .get_webview_window(LYRICS_LABEL)
        .ok_or_else(|| "[lyrics] 歌词窗口未初始化，请重启应用".to_string())?;

    // show 前先确保穿透
    force_lyrics_passthrough(&win);
    win.show().map_err(|e| e.to_string())?;
    // show 后再加固一次，防止 WS_EX_TRANSPARENT 被 WM_SHOWWINDOW 消息覆盖
    force_lyrics_passthrough(&win);

    let _ = app.emit("panel:request-state", ());
    notify_viewers(&app);
    eprintln!("[lyrics] 歌词窗口已显示");
    Ok(())
}

#[tauri::command]
fn close_lyrics_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(LYRICS_LABEL) {
        // hide 而非 close：保留 webview，下次直接 show
        win.hide().map_err(|e| e.to_string())?;
    }
    notify_viewers(&app);
    eprintln!("[lyrics] 歌词窗口已隐藏");
    Ok(())
}

#[tauri::command]
fn is_lyrics_window_open(app: tauri::AppHandle) -> bool {
    app.get_webview_window(LYRICS_LABEL)
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false)
}

// ═══════════════ 回退：原生托盘菜单 ═══════════════
//
// 仅在自绘面板窗口创建失败时挂载。否则不能挂——Windows 上只要托盘绑定了菜单，
// 右键就会强制弹出原生菜单并盖住自绘面板（tauri 2.11 未暴露 menu_on_right_click）。
fn build_fallback_menu(app: &tauri::AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    let title = tauri::menu::MenuItem::with_id(app, "info", "🎵  RanNuan Music", false, None::<&str>)?;
    let sep1 = tauri::menu::PredefinedMenuItem::separator(app)?;
    let play_pause = tauri::menu::MenuItem::with_id(app, "play_pause", "▶  播放 / 暂停", true, None::<&str>)?;
    let next_track = tauri::menu::MenuItem::with_id(app, "next", "⏭  下一首", true, None::<&str>)?;
    let prev_track = tauri::menu::MenuItem::with_id(app, "prev", "⏮  上一首", true, None::<&str>)?;
    let sep2 = tauri::menu::PredefinedMenuItem::separator(app)?;
    let show_i = tauri::menu::MenuItem::with_id(app, "show", "▣  显示主窗口", true, None::<&str>)?;
    let quit_i = tauri::menu::MenuItem::with_id(app, "quit", "✕  退出", true, None::<&str>)?;

    tauri::menu::Menu::with_items(
        app,
        &[&title, &sep1, &play_pause, &next_track, &prev_track, &sep2, &show_i, &quit_i],
    )
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
            show_main_window,
            quit_app,
            open_lyrics_window,
            close_lyrics_window,
            is_lyrics_window_open,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // ── 预建歌词窗口（与面板同理，必须在 setup 阶段创建）──
            if let Err(e) = create_lyrics_window(app.handle()) {
                eprintln!("[lyrics] 歌词窗口预创建失败: {e}");
            }

            // ── 预建托盘面板窗口 ──
            let panel_ok = match create_panel_window(app.handle()) {
                Ok(()) => true,
                Err(e) => {
                    eprintln!("[tray] 面板窗口创建失败，回退原生菜单: {e}");
                    false
                }
            };

            // 面板失焦自动收起
            if panel_ok {
                if let Some(panel) = app.get_webview_window(PANEL_LABEL) {
                    let handle = app.handle().clone();
                    panel.on_window_event(move |event| {
                        if let WindowEvent::Focused(false) = event {
                            if let Some(p) = handle.get_webview_window(PANEL_LABEL) {
                                let _ = p.hide();
                            }
                            notify_viewers(&handle);
                        }
                    });
                }
            }

            let mut tray_builder = tauri::tray::TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("RanNuan Music")
                .on_tray_icon_event(|tray, event| {
                    let app = tray.app_handle();
                    match event {
                        // 左键 / 双击 → 恢复主窗口（保持既有行为）
                        tauri::tray::TrayIconEvent::Click {
                            button: tauri::tray::MouseButton::Left,
                            button_state: tauri::tray::MouseButtonState::Up,
                            ..
                        }
                        | tauri::tray::TrayIconEvent::DoubleClick {
                            button: tauri::tray::MouseButton::Left,
                            ..
                        } => {
                            reveal_main_window(app);
                        }
                        // 右键 → 切换自绘控制面板
                        tauri::tray::TrayIconEvent::Click {
                            button: tauri::tray::MouseButton::Right,
                            button_state: tauri::tray::MouseButtonState::Up,
                            position,
                            ..
                        } => {
                            toggle_tray_panel(app, Some(position));
                        }
                        _ => {}
                    }
                });

            // 仅在面板不可用时挂原生菜单兜底
            if !panel_ok {
                let menu = build_fallback_menu(app.handle())?;
                tray_builder = tray_builder.menu(&menu).on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "play_pause" => { let _ = app.emit("tray:play-pause", ()); }
                        "next" => { let _ = app.emit("tray:next", ()); }
                        "prev" => { let _ = app.emit("tray:prev", ()); }
                        "show" => reveal_main_window(app),
                        "quit" => app.exit(0),
                        _ => {}
                    }
                });
            }

            let tray = tray_builder.build(app)?;

            // ★ 保存托盘句柄，供 update_tray_tooltip 命令使用
            app.manage(TrayState {
                handle: Mutex::new(Some(tray)),
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
