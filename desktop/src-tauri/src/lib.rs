use std::process::Command;
use std::{
    sync::Mutex,
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, ShortcutState};

/// Windows 上 RegisterHotKey 会在按住时重复派发 Pressed，Ctrl+Alt 组合还常在
/// 几十毫秒内连发两次。过短间隔内的重复触发直接丢掉，避免锁定被立刻切回去。
const SHORTCUT_DEBOUNCE: Duration = Duration::from_millis(400);

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

/// 独立歌词窗的原生交互状态。鼠标穿透开启后 WebView 无法再收到点击，
/// 因而需要由 Rust 记住状态，并在下次显示时主动恢复交互。
struct LyricsWindowState {
    locked: Mutex<bool>,
    mouse_passthrough: Mutex<bool>,
    last_lyrics_shortcut: Mutex<Option<Instant>>,
    last_lock_shortcut: Mutex<Option<Instant>>,
}

fn accept_debounced_shortcut(slot: &Mutex<Option<Instant>>) -> bool {
    let mut last = slot.lock().unwrap();
    if let Some(prev) = *last {
        if prev.elapsed() < SHORTCUT_DEBOUNCE {
            return false;
        }
    }
    *last = Some(Instant::now());
    true
}

/// Windows 低级键盘钩子：当 RegisterHotKey 因「已被其他程序占用」失败时，
/// 仍然能收到 Ctrl+Alt+D / Ctrl+Alt+L。QQ 默认占用 Ctrl+Alt+L，这是最常见原因。
#[cfg(windows)]
mod lyrics_hotkey_hook {
    use super::{
        toggle_lyrics_window_from_shortcut, toggle_lyrics_window_lock_from_shortcut,
    };
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Mutex;
    use windows_sys::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, VK_LCONTROL, VK_LMENU, VK_RCONTROL, VK_SHIFT,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, SetWindowsHookExW, KBDLLHOOKSTRUCT, LLKHF_INJECTED, WH_KEYBOARD_LL,
        WM_KEYDOWN, WM_SYSKEYDOWN,
    };

    const VK_D: u32 = 0x44;
    const VK_L: u32 = 0x4C;

    static APP: Mutex<Option<tauri::AppHandle>> = Mutex::new(None);
    static CATCH_D: AtomicBool = AtomicBool::new(false);
    static CATCH_L: AtomicBool = AtomicBool::new(false);
    static INSTALLED: AtomicBool = AtomicBool::new(false);

    fn key_down(vk: u16) -> bool {
        unsafe { GetAsyncKeyState(vk as i32) as u16 & 0x8000 != 0 }
    }

    fn dispatch(vk: u32) -> bool {
        let ctrl = key_down(VK_LCONTROL) || key_down(VK_RCONTROL);
        // 只用左 Alt，避开国际键盘 AltGr（右 Alt = Ctrl+Alt）误触。
        let alt = key_down(VK_LMENU);
        let shift = key_down(VK_SHIFT);
        if !ctrl || !alt || shift {
            return false;
        }

        let toggle_window = vk == VK_D && CATCH_D.load(Ordering::SeqCst);
        let toggle_lock = vk == VK_L && CATCH_L.load(Ordering::SeqCst);
        if !toggle_window && !toggle_lock {
            return false;
        }

        let Some(app) = APP.lock().unwrap().clone() else {
            return false;
        };
        let _ = app.clone().run_on_main_thread(move || {
            if toggle_window {
                toggle_lyrics_window_from_shortcut(&app);
            } else {
                toggle_lyrics_window_lock_from_shortcut(&app);
            }
        });
        true
    }

    unsafe extern "system" fn hook_proc(
        code: i32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        if code >= 0 {
            let msg = wparam as u32;
            if msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN {
                let kb = &*(lparam as *const KBDLLHOOKSTRUCT);
                if kb.flags & LLKHF_INJECTED == 0 && dispatch(kb.vkCode) {
                    return 1;
                }
            }
        }
        CallNextHookEx(std::ptr::null_mut(), code, wparam, lparam)
    }

    pub fn install(app: tauri::AppHandle, catch_d: bool, catch_l: bool) {
        if !catch_d && !catch_l {
            return;
        }
        CATCH_D.store(catch_d, Ordering::SeqCst);
        CATCH_L.store(catch_l, Ordering::SeqCst);
        *APP.lock().unwrap() = Some(app);

        if INSTALLED.swap(true, Ordering::SeqCst) {
            return;
        }

        let hook = unsafe {
            SetWindowsHookExW(WH_KEYBOARD_LL, Some(hook_proc), std::ptr::null_mut(), 0)
        };
        if hook.is_null() {
            INSTALLED.store(false, Ordering::SeqCst);
            eprintln!(
                "[shortcuts] 键盘钩子安装失败: {}",
                std::io::Error::last_os_error()
            );
            return;
        }

        let mut occupied = Vec::new();
        if catch_d {
            occupied.push("Ctrl+Alt+D");
        }
        if catch_l {
            occupied.push("Ctrl+Alt+L");
        }
        eprintln!(
            "[shortcuts] {} 已被其他程序占用（常见于 QQ 锁定快捷键），已改用键盘钩子兜底",
            occupied.join(" / ")
        );
    }
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
    .min_inner_size(460.0, 150.0)
    .minimizable(false)
    .maximizable(false)
    .focusable(true)
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

    eprintln!("[lyrics] 歌词窗口预创建完成（支持悬停控制与手动调整大小）");
    Ok(())
}

fn set_lyrics_mouse_passthrough(app: &tauri::AppHandle, passthrough: bool) -> Result<(), String> {
    let win = app
        .get_webview_window(LYRICS_LABEL)
        .ok_or_else(|| "歌词窗口未初始化".to_string())?;
    win.set_ignore_cursor_events(passthrough)
        .map_err(|e| e.to_string())?;
    if let Some(state) = app.try_state::<LyricsWindowState>() {
        *state.mouse_passthrough.lock().unwrap() = passthrough;
    }
    let _ = app.emit("lyrics:mouse-passthrough", passthrough);
    Ok(())
}

/// 锁定时歌词窗会穿透鼠标。这里轮询系统鼠标位置；鼠标进入歌词范围后临时恢复
/// 窗口输入，让前端能收到 hover 并显示工具条。鼠标离开后前端会再次请求穿透。
fn watch_lyrics_hover(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_millis(70));

            let state = app.state::<LyricsWindowState>();
            if !*state.locked.lock().unwrap() {
                break;
            }
            drop(state);

            let Some(win) = app.get_webview_window(LYRICS_LABEL) else {
                break;
            };
            if !win.is_visible().unwrap_or(false) {
                break;
            }

            let (Ok(cursor), Ok(position), Ok(size)) = (
                app.cursor_position(),
                win.outer_position(),
                win.outer_size(),
            ) else {
                continue;
            };

            let inside = cursor.x >= position.x as f64
                && cursor.x <= position.x as f64 + size.width as f64
                && cursor.y >= position.y as f64
                && cursor.y <= position.y as f64 + size.height as f64;
            if inside {
                let _ = set_lyrics_mouse_passthrough(&app, false);
                break;
            }
        }
    });
}

#[tauri::command]
fn open_lyrics_window(app: tauri::AppHandle) -> Result<(), String> {
    // 窗口在 setup 中已预创建，这里只做 show，不做创建
    let win = app
        .get_webview_window(LYRICS_LABEL)
        .ok_or_else(|| "[lyrics] 歌词窗口未初始化，请重启应用".to_string())?;

    let locked = app
        .try_state::<LyricsWindowState>()
        .map(|state| *state.locked.lock().unwrap())
        .unwrap_or(true);
    if let Err(error) = win.set_always_on_top(true) {
        eprintln!("[lyrics] 显示时设置置顶失败: {error}");
    }
    if let Err(error) = win.set_resizable(!locked) {
        eprintln!("[lyrics] 显示时设置可调整大小失败: {error}");
    }
    if let Err(error) = set_lyrics_mouse_passthrough(&app, locked) {
        eprintln!("[lyrics] 显示时设置鼠标穿透失败: {error}");
    }
    win.show().map_err(|e| e.to_string())?;
    if locked {
        watch_lyrics_hover(app.clone());
    }

    let _ = app.emit("panel:request-state", ());
    let _ = app.emit("lyrics:visible-state", true);
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
    let _ = app.emit("lyrics:visible-state", false);
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

/// Ctrl+Alt+D 必须在主窗口隐藏后继续生效，因此由原生快捷键回调直接切换歌词窗，
/// 不再依赖主窗口 WebView 的生命周期。不使用 Ctrl+D，避免抢占 Excel 等应用的常用快捷键。
fn toggle_lyrics_window_from_shortcut(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<LyricsWindowState>() {
        if !accept_debounced_shortcut(&state.last_lyrics_shortcut) {
            return;
        }
    }

    let result = if is_lyrics_window_open(app.clone()) {
        close_lyrics_window(app.clone())
    } else {
        open_lyrics_window(app.clone())
    };

    if let Err(error) = result {
        eprintln!("[shortcuts] 切换桌面歌词失败: {error}");
    }
}

/// 副窗口的播放命令统一先发给 Rust，再由 Rust 广播给主窗口。
/// 这避免了 WebView 间直接 emit 在某些 Windows WebView2 环境中丢失的问题。
#[tauri::command]
fn lyrics_player_command(app: tauri::AppHandle, command: serde_json::Value) -> Result<(), String> {
    let command_type = command
        .get("type")
        .and_then(serde_json::Value::as_str)
        .ok_or_else(|| "缺少歌词窗口命令类型".to_string())?;

    if !matches!(command_type, "toggle-play" | "next" | "prev") {
        return Err(format!("不支持的歌词窗口命令: {command_type}"));
    }

    app.emit("panel:cmd", command).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_lyrics_window_locked(app: tauri::AppHandle, locked: bool) -> Result<bool, String> {
    let win = app
        .get_webview_window(LYRICS_LABEL)
        .ok_or_else(|| "歌词窗口未初始化".to_string())?;
    // 先记下锁定状态再改窗口属性：置顶 / 缩放 / 穿透在隐藏窗口或非主线程上
    // 可能失败，但不能因此把状态回滚，否则快捷键会表现为时灵时不灵。
    if let Some(state) = app.try_state::<LyricsWindowState>() {
        *state.locked.lock().unwrap() = locked;
    }

    let visible = win.is_visible().unwrap_or(false);
    // 歌词窗无论是否锁定都必须保持置顶；锁定只控制交互、移动和缩放。
    if let Err(error) = win.set_always_on_top(true) {
        eprintln!("[lyrics] 设置置顶失败: {error}");
    }
    if let Err(error) = win.set_resizable(!locked) {
        eprintln!("[lyrics] 设置可调整大小失败: {error}");
    }
    if let Err(error) = set_lyrics_mouse_passthrough(&app, locked) {
        eprintln!("[lyrics] 设置鼠标穿透失败: {error}");
        let retry_app = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(40));
            let still_locked = retry_app
                .try_state::<LyricsWindowState>()
                .map(|state| *state.locked.lock().unwrap())
                .unwrap_or(locked);
            if still_locked == locked {
                if let Err(retry_error) = set_lyrics_mouse_passthrough(&retry_app, locked) {
                    eprintln!("[lyrics] 重试鼠标穿透仍失败: {retry_error}");
                }
            }
        });
    }
    let _ = app.emit("lyrics:lock-state", locked);
    if locked && visible {
        watch_lyrics_hover(app);
    }
    Ok(locked)
}

#[tauri::command]
fn is_lyrics_window_locked(state: State<LyricsWindowState>) -> bool {
    *state.locked.lock().unwrap()
}

fn toggle_lyrics_window_lock_from_shortcut(app: &tauri::AppHandle) {
    let next_locked = match app.try_state::<LyricsWindowState>() {
        Some(state) => {
            if !accept_debounced_shortcut(&state.last_lock_shortcut) {
                return;
            }
            !*state.locked.lock().unwrap()
        }
        None => true,
    };

    match set_lyrics_window_locked(app.clone(), next_locked) {
        Ok(locked) => eprintln!(
            "[shortcuts] 桌面歌词已{}",
            if locked { "锁定" } else { "解锁" }
        ),
        Err(error) => eprintln!("[shortcuts] 切换桌面歌词锁定状态失败: {error}"),
    }
}

#[tauri::command]
fn set_lyrics_window_hovering(app: tauri::AppHandle, hovering: bool) -> Result<(), String> {
    let locked = app
        .try_state::<LyricsWindowState>()
        .map(|state| *state.locked.lock().unwrap())
        .unwrap_or(true);
    if !locked {
        return Ok(());
    }

    set_lyrics_mouse_passthrough(&app, !hovering)?;
    if !hovering {
        watch_lyrics_hover(app);
    }
    Ok(())
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
            lyrics_player_command,
            set_lyrics_window_locked,
            is_lyrics_window_locked,
            set_lyrics_window_hovering,
        ])
        .setup(|app| {
            app.manage(LyricsWindowState {
                locked: Mutex::new(true),
                mouse_passthrough: Mutex::new(false),
                last_lyrics_shortcut: Mutex::new(None),
                last_lock_shortcut: Mutex::new(None),
            });

            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(|app, shortcut, event| {
                        if event.state != ShortcutState::Pressed {
                            return;
                        }

                        // 热键回调跑在 global-hotkey 自己的窗口线程上，Windows 上直接
                        // 改 WebView 属性会偶发失败。必须切回主线程再动歌词窗。
                        let toggle_window = shortcut
                            .matches(Modifiers::CONTROL | Modifiers::ALT, Code::KeyD);
                        let toggle_lock = shortcut
                            .matches(Modifiers::CONTROL | Modifiers::ALT, Code::KeyL);
                        if !toggle_window && !toggle_lock {
                            return;
                        }

                        let app = app.clone();
                        if let Err(error) = app.clone().run_on_main_thread(move || {
                            if toggle_window {
                                toggle_lyrics_window_from_shortcut(&app);
                            } else {
                                toggle_lyrics_window_lock_from_shortcut(&app);
                            }
                        }) {
                            eprintln!("[shortcuts] 无法切回主线程: {error}");
                        }
                    })
                    .build(),
            )?;

            let mut hook_d = false;
            let mut hook_l = false;
            for shortcut in ["CTRL+ALT+D", "CTRL+ALT+L"] {
                if let Err(error) = app.global_shortcut().register(shortcut) {
                    eprintln!("[shortcuts] 注册 {shortcut} 失败: {error}");
                    if shortcut.ends_with('D') {
                        hook_d = true;
                    } else {
                        hook_l = true;
                    }
                }
            }
            #[cfg(windows)]
            lyrics_hotkey_hook::install(app.handle().clone(), hook_d, hook_l);

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
