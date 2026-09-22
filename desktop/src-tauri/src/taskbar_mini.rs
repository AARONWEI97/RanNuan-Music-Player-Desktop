//! 把迷你播放条放进 Windows 任务栏。
//!
//! AudioBand 走的是 explorer 进程内的 Deskband（IDeskBand）。Windows 11 把任务栏
//! 换成了 XAML，不再挂第三方工具条，跨进程 SetParent 到 Shell_TrayWnd 也立不住。
//! 这里改成：贴在系统「小组件」按钮（任务栏最左边那个天气预报）右侧，高度与任务栏
//! 一致的置顶无边框窗口，看起来像嵌进去的小组件。跟着任务栏移动、自动隐藏和全屏。

use std::time::Duration;

use serde::Serialize;
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

pub const LABEL: &str = "taskbar-mini";

const PREFS_FILE: &str = "taskbar-mini.json";
/// 播放条希望占用的宽度（CSS 像素，再乘任务栏 DPI）。
/// 比一整条工具栏窄一点，接近任务栏小组件的体量。
const DESIRED_WIDTH_DIP: f64 = 300.0;
const MIN_WIDTH_DIP: f64 = 200.0;
const DESIRED_HEIGHT_DIP: f64 = 156.0;
const MIN_HEIGHT_DIP: f64 = 120.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct PxRect {
    left: i32,
    top: i32,
    right: i32,
    bottom: i32,
}

impl PxRect {
    fn w(self) -> i32 {
        (self.right - self.left).max(0)
    }
    fn h(self) -> i32 {
        (self.bottom - self.top).max(0)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Edge {
    Bottom,
    Top,
    Left,
    Right,
}

impl Edge {
    fn as_str(self) -> &'static str {
        match self {
            Edge::Bottom => "bottom",
            Edge::Top => "top",
            Edge::Left => "left",
            Edge::Right => "right",
        }
    }

    fn is_horizontal(self) -> bool {
        matches!(self, Edge::Bottom | Edge::Top)
    }
}

fn edge_of(bar: PxRect, mon: PxRect) -> Edge {
    if bar.w() >= bar.h() {
        let mid = bar.top + bar.h() / 2;
        let mon_mid = mon.top + mon.h() / 2;
        if mid < mon_mid {
            Edge::Top
        } else {
            Edge::Bottom
        }
    } else {
        let mid = bar.left + bar.w() / 2;
        let mon_mid = mon.left + mon.w() / 2;
        if mid < mon_mid {
            Edge::Left
        } else {
            Edge::Right
        }
    }
}

/// 任务栏自动隐藏时，窗口矩形会滑出显示器，只剩一条缝。
fn taskbar_is_shown(bar: PxRect, mon: PxRect) -> bool {
    let left = bar.left.max(mon.left);
    let top = bar.top.max(mon.top);
    let right = bar.right.min(mon.right);
    let bottom = bar.bottom.min(mon.bottom);
    let iw = (right - left).max(0);
    let ih = (bottom - top).max(0);
    if bar.w() >= bar.h() {
        ih >= 16 && ih * 2 >= bar.h()
    } else {
        iw >= 16 && iw * 2 >= bar.w()
    }
}

fn sanitize_anchor(v: f64) -> f64 {
    if v.is_finite() {
        v.clamp(0.0, 1.0)
    } else {
        1.0
    }
}

fn rects_overlap(a: PxRect, b: PxRect) -> bool {
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

/// UI 自动化有时会按未感知 DPI 的虚拟坐标返回。能直接重叠任务栏就用原值，
/// 否则按高度比折回物理像素。
fn map_uia_rect(rect: PxRect, bar: PxRect) -> Option<PxRect> {
    if rects_overlap(rect, bar) && rect.w() > 8 && rect.h() > 8 {
        return Some(rect);
    }
    if rect.h() <= 0 || bar.h() <= 0 {
        return None;
    }
    let scale = rect.h() as f64 / bar.h() as f64;
    if !(1.15..3.5).contains(&scale) {
        return None;
    }
    let mapped = PxRect {
        left: (rect.left as f64 / scale).round() as i32,
        top: (rect.top as f64 / scale).round() as i32,
        right: (rect.right as f64 / scale).round() as i32,
        bottom: (rect.bottom as f64 / scale).round() as i32,
    };
    if rects_overlap(mapped, bar) && mapped.w() > 8 && mapped.h() > 8 {
        Some(mapped)
    } else {
        None
    }
}

/// 水平任务栏：优先贴在小组件右侧、居中图标区左侧，高度与任务栏相同。
/// 左侧口袋放不下（例如图标左对齐）时，退到图标和托盘之间，贴着托盘。
fn horizontal_slot(
    bar: PxRect,
    widgets_right: Option<i32>,
    icons_left: i32,
    icons_right: i32,
    tray_left: i32,
    desired_w: i32,
    min_w: i32,
) -> PxRect {
    let tray_left = tray_left.clamp(bar.left + 1, bar.right);
    let icons_left = icons_left.clamp(bar.left, tray_left);
    let icons_right = icons_right.clamp(bar.left, tray_left);
    let pocket_left = match widgets_right {
        Some(edge) => edge.saturating_add(4),
        None => bar.left + 4,
    }
    .clamp(bar.left, tray_left);
    let pocket_right = icons_left.max(pocket_left);
    // 和开始按钮留一条缝，两个圆角芯片不要挨死。
    let available = pocket_right - pocket_left - 8;
    let stay_min = (min_w.saturating_mul(3) / 4).clamp(1, min_w.max(1));
    if available >= stay_min {
        let w = desired_w
            .min(available)
            .max(stay_min)
            .min(available)
            .max(1);
        return PxRect {
            left: pocket_left,
            top: bar.top,
            right: pocket_left + w,
            bottom: bar.bottom,
        };
    }

    let gap_left = icons_right.max(bar.left).min(tray_left);
    let track = (tray_left - gap_left).max(1);
    let w = desired_w.min((track - 6).max(1)).min(track).max(1);
    let left = (tray_left - w).max(gap_left);
    PxRect {
        left,
        top: bar.top,
        right: left + w,
        bottom: bar.bottom,
    }
}

/// 竖着的任务栏：同样先贴小组件，放不下再退到图标和托盘之间。
fn vertical_slot(
    bar: PxRect,
    widgets_bottom: Option<i32>,
    icons_top: i32,
    icons_bottom: i32,
    tray_top: i32,
    desired_h: i32,
    min_h: i32,
) -> PxRect {
    let tray_top = tray_top.clamp(bar.top + 1, bar.bottom);
    let icons_top = icons_top.clamp(bar.top, tray_top);
    let icons_bottom = icons_bottom.clamp(bar.top, tray_top);
    let pocket_top = match widgets_bottom {
        Some(edge) => edge.saturating_add(4),
        None => bar.top + 4,
    }
    .clamp(bar.top, tray_top);
    let pocket_bottom = icons_top.max(pocket_top);
    let available = pocket_bottom - pocket_top - 8;
    let stay_min = (min_h.saturating_mul(3) / 4).clamp(1, min_h.max(1));
    if available >= stay_min {
        let h = desired_h
            .min(available)
            .max(stay_min)
            .min(available)
            .max(1);
        return PxRect {
            left: bar.left,
            top: pocket_top,
            right: bar.right,
            bottom: pocket_top + h,
        };
    }

    let gap_top = icons_bottom.max(bar.top).min(tray_top);
    let track = (tray_top - gap_top).max(1);
    let h = desired_h.min((track - 6).max(1)).min(track).max(1);
    let top = (tray_top - h).max(gap_top);
    PxRect {
        left: bar.left,
        top,
        right: bar.right,
        bottom: top + h,
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct TaskbarChrome {
    pub light: bool,
    pub edge: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Prefs {
    enabled: bool,
    anchor: f64,
}

impl Default for Prefs {
    fn default() -> Self {
        Self {
            enabled: false,
            anchor: 1.0,
        }
    }
}

struct TaskbarMiniState {
    wants_open: std::sync::Mutex<bool>,
    anchor: std::sync::Mutex<f64>,
    last_slot: std::sync::Mutex<Option<(i32, i32, i32, i32)>>,
    last_chrome: std::sync::Mutex<Option<(bool, String)>>,
    /// 用户刚按下按钮时，下一次显示可以激活窗口；自动恢复则不能抢焦点。
    activate_on_next_show: std::sync::Mutex<bool>,
}

fn prefs_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    let dir = app.path().app_config_dir().ok()?;
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir.join(PREFS_FILE))
}

fn load_prefs(app: &tauri::AppHandle) -> Prefs {
    let Some(path) = prefs_path(app) else {
        return Prefs::default();
    };
    let Ok(text) = std::fs::read_to_string(path) else {
        return Prefs::default();
    };
    serde_json::from_str::<Prefs>(&text)
        .map(|p| Prefs {
            enabled: p.enabled,
            anchor: sanitize_anchor(p.anchor),
        })
        .unwrap_or_default()
}

fn save_prefs(app: &tauri::AppHandle) {
    let Some(state) = app.try_state::<TaskbarMiniState>() else {
        return;
    };
    let prefs = Prefs {
        enabled: *state.wants_open.lock().unwrap(),
        anchor: sanitize_anchor(*state.anchor.lock().unwrap()),
    };
    let Some(path) = prefs_path(app) else {
        return;
    };
    if let Ok(text) = serde_json::to_string_pretty(&prefs) {
        let _ = std::fs::write(path, text);
    }
}

#[tauri::command]
pub fn taskbar_mini_command(
    app: tauri::AppHandle,
    command: serde_json::Value,
) -> Result<(), String> {
    let kind = command
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    match kind {
        "toggle-play" | "next" | "prev" | "toggle-fav" => {}
        "seek" if command.get("ms").and_then(|v| v.as_f64()).is_some() => {}
        "set-volume" if command.get("volume").and_then(|v| v.as_f64()).is_some() => {}
        _ => return Err(format!("不支持的任务栏命令: {kind}")),
    }
    app.emit("panel:cmd", command).map_err(|e| e.to_string())
}

#[cfg(windows)]
mod host {
    use super::*;
    use windows_sys::Win32::Foundation::{HWND, LPARAM, RECT};
    use windows_sys::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_DONOTROUND,
    };
    use windows_sys::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    };
    use windows_sys::Win32::System::Registry::{
        RegGetValueW, HKEY_CURRENT_USER, RRF_RT_REG_DWORD,
    };
    use windows_sys::Win32::System::Threading::GetCurrentProcessId;
    use windows_sys::Win32::UI::HiDpi::GetDpiForWindow;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        EnumChildWindows, FindWindowW, GetClassNameW, GetForegroundWindow, GetWindowRect,
        GetWindowThreadProcessId, IsIconic, SetWindowPos, ShowWindow, HWND_TOPMOST, SWP_NOACTIVATE,
        SWP_NOMOVE, SWP_NOSIZE, SW_HIDE, SW_SHOWNOACTIVATE,
    };

    struct Hunt {
        tray: HWND,
        task: HWND,
        start: HWND,
    }

    fn class_name(hwnd: HWND) -> String {
        let mut buf = [0u16; 256];
        let n = unsafe { GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32) };
        if n <= 0 {
            return String::new();
        }
        String::from_utf16_lossy(&buf[..n as usize])
    }

    unsafe extern "system" fn hunt_proc(hwnd: HWND, lp: LPARAM) -> i32 {
        let hunt = &mut *(lp as *mut Hunt);
        match class_name(hwnd).as_str() {
            "TrayNotifyWnd" if hunt.tray.is_null() => hunt.tray = hwnd,
            "MSTaskListWClass" if hunt.task.is_null() => hunt.task = hwnd,
            "Start" if hunt.start.is_null() => hunt.start = hwnd,
            _ => {}
        }
        EnumChildWindows(hwnd, Some(hunt_proc), lp);
        1
    }

    fn window_rect(hwnd: HWND) -> Option<PxRect> {
        if hwnd.is_null() {
            return None;
        }
        let mut r = RECT {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
        };
        if unsafe { GetWindowRect(hwnd, &mut r) } == 0 {
            return None;
        }
        if r.right <= r.left || r.bottom <= r.top {
            return None;
        }
        Some(PxRect {
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
        })
    }

    fn overlaps(child: PxRect, bar: PxRect, horizontal: bool) -> bool {
        if horizontal {
            child.bottom > bar.top + 2 && child.top < bar.bottom - 2
        } else {
            child.right > bar.left + 2 && child.left < bar.right - 2
        }
    }

    struct TaskbarGeom {
        edge: Edge,
        shown: bool,
        slot: PxRect,
        monitor: PxRect,
    }

    /// 小组件按钮在 XAML 任务栏里，没有自己的 HWND。用 UI 自动化按 AutomationId 找。
    fn probe_widgets_far_edge(taskbar: HWND, bar: PxRect, horizontal: bool) -> Option<i32> {
        use windows::Win32::Foundation::HWND as WinHwnd;
        use windows::Win32::System::Com::{
            CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
            COINIT_APARTMENTTHREADED,
        };
        use windows::Win32::System::Variant::{VariantClear, VARIANT, VT_BSTR};
        use windows::Win32::UI::Accessibility::{
            CUIAutomation, IUIAutomation, TreeScope_Descendants, UIA_AutomationIdPropertyId,
        };

        struct ComInit(bool);
        impl Drop for ComInit {
            fn drop(&mut self) {
                if self.0 {
                    unsafe { CoUninitialize() };
                }
            }
        }

        let needs_uninit = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) }.is_ok();
        let _com = ComInit(needs_uninit);

        let rect = unsafe {
            let automation: IUIAutomation =
                CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).ok()?;
            let root = automation.ElementFromHandle(WinHwnd(taskbar)).ok()?;
            let mut variant: VARIANT = core::mem::zeroed();
            {
                let head = &mut *variant.Anonymous.Anonymous;
                head.vt = VT_BSTR;
                head.Anonymous.bstrVal =
                    core::mem::ManuallyDrop::new(windows::core::BSTR::from("WidgetsButton"));
            }
            let condition =
                automation.CreatePropertyCondition(UIA_AutomationIdPropertyId, &variant);
            let _ = VariantClear(&mut variant);
            let condition = condition.ok()?;
            let element = root.FindFirst(TreeScope_Descendants, &condition).ok()?;
            let r = element.CurrentBoundingRectangle().ok()?;
            PxRect {
                left: r.left,
                top: r.top,
                right: r.right,
                bottom: r.bottom,
            }
        };
        let rect = map_uia_rect(rect, bar)?;
        if horizontal {
            if rect.left > bar.left + bar.w() / 2 {
                return None;
            }
            Some(rect.right.min(bar.right))
        } else if rect.top > bar.top + bar.h() / 2 {
            None
        } else {
            Some(rect.bottom.min(bar.bottom))
        }
    }

    fn cached_widgets_far_edge(taskbar: HWND, bar: PxRect, horizontal: bool) -> Option<i32> {
        struct Cache {
            at: std::time::Instant,
            horizontal: bool,
            /// 相对任务栏左缘 / 上缘的远边，任务栏挪位置时不用重测。
            offset: Option<i32>,
        }
        static CACHE: std::sync::Mutex<Option<Cache>> = std::sync::Mutex::new(None);

        let now = std::time::Instant::now();
        if let Ok(guard) = CACHE.lock() {
            if let Some(cache) = guard.as_ref() {
                if cache.horizontal == horizontal
                    && now.duration_since(cache.at) < Duration::from_millis(1500)
                {
                    return cache.offset.map(|off| {
                        if horizontal {
                            bar.left + off
                        } else {
                            bar.top + off
                        }
                    });
                }
            }
        }

        let far = probe_widgets_far_edge(taskbar, bar, horizontal);
        let offset = far.map(|edge| {
            if horizontal {
                edge - bar.left
            } else {
                edge - bar.top
            }
        });
        if let Ok(mut guard) = CACHE.lock() {
            *guard = Some(Cache {
                at: now,
                horizontal,
                offset,
            });
        }
        static LOG_ONCE: std::sync::Once = std::sync::Once::new();
        LOG_ONCE.call_once(|| {
            eprintln!("[taskbar-mini] 小组件远边 {far:?}，任务栏 {}x{}", bar.w(), bar.h());
        });
        far
    }

    fn query(scale: f64) -> Option<TaskbarGeom> {
        let class: Vec<u16> = "Shell_TrayWnd".encode_utf16().chain([0]).collect();
        let taskbar = unsafe { FindWindowW(class.as_ptr(), std::ptr::null()) };
        let bar = window_rect(taskbar)?;

        let monitor_info = unsafe {
            let hmon = MonitorFromWindow(taskbar, MONITOR_DEFAULTTONEAREST);
            let mut info: MONITORINFO = std::mem::zeroed();
            info.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
            if GetMonitorInfoW(hmon, &mut info) == 0 {
                return None;
            }
            info
        };
        let mon = PxRect {
            left: monitor_info.rcMonitor.left,
            top: monitor_info.rcMonitor.top,
            right: monitor_info.rcMonitor.right,
            bottom: monitor_info.rcMonitor.bottom,
        };
        let edge = edge_of(bar, mon);
        let shown = taskbar_is_shown(bar, mon);

        let mut hunt = Hunt {
            tray: std::ptr::null_mut(),
            task: std::ptr::null_mut(),
            start: std::ptr::null_mut(),
        };
        unsafe { EnumChildWindows(taskbar, Some(hunt_proc), &mut hunt as *mut Hunt as LPARAM) };

        let tray = window_rect(hunt.tray).filter(|r| overlaps(*r, bar, edge.is_horizontal()));
        let task = window_rect(hunt.task).filter(|r| overlaps(*r, bar, edge.is_horizontal()));
        let start = window_rect(hunt.start).filter(|r| overlaps(*r, bar, edge.is_horizontal()));

        let mut icons_left: Option<i32> = None;
        let mut icons_right = bar.left;
        let mut icons_top: Option<i32> = None;
        let mut icons_bottom = bar.top;
        for r in [start, task].into_iter().flatten() {
            icons_left = Some(icons_left.map_or(r.left, |v| v.min(r.left)));
            icons_right = icons_right.max(r.right);
            icons_top = Some(icons_top.map_or(r.top, |v| v.min(r.top)));
            icons_bottom = icons_bottom.max(r.bottom);
        }

        let scale = if scale.is_finite() && scale > 0.5 {
            scale
        } else {
            1.0
        };
        let slot = if edge.is_horizontal() {
            let tray_left = tray
                .filter(|r| r.left > bar.left + bar.w() / 5)
                .map(|r| r.left - 2)
                .unwrap_or(bar.right);
            let icons_right = icons_right.min(tray_left);
            horizontal_slot(
                bar,
                cached_widgets_far_edge(taskbar, bar, true),
                icons_left.unwrap_or(bar.left),
                icons_right,
                tray_left,
                (DESIRED_WIDTH_DIP * scale).round() as i32,
                (MIN_WIDTH_DIP * scale).round() as i32,
            )
        } else {
            let tray_top = tray
                .filter(|r| r.top > bar.top + bar.h() / 5)
                .map(|r| r.top - 2)
                .unwrap_or(bar.bottom);
            let icons_bottom = icons_bottom.min(tray_top);
            vertical_slot(
                bar,
                cached_widgets_far_edge(taskbar, bar, false),
                icons_top.unwrap_or(bar.top),
                icons_bottom,
                tray_top,
                (DESIRED_HEIGHT_DIP * scale).round() as i32,
                (MIN_HEIGHT_DIP * scale).round() as i32,
            )
        };

        Some(TaskbarGeom {
            edge,
            shown,
            slot,
            monitor: mon,
        })
    }

    fn dpi_scale(taskbar_class_hwnd: HWND) -> f64 {
        let dpi = unsafe { GetDpiForWindow(taskbar_class_hwnd) };
        if dpi == 0 {
            1.0
        } else {
            dpi as f64 / 96.0
        }
    }

    fn query_with_live_dpi() -> Option<TaskbarGeom> {
        let class: Vec<u16> = "Shell_TrayWnd".encode_utf16().chain([0]).collect();
        let taskbar = unsafe { FindWindowW(class.as_ptr(), std::ptr::null()) };
        if taskbar.is_null() {
            return None;
        }
        query(dpi_scale(taskbar))
    }

    pub fn chrome() -> Result<TaskbarChrome, String> {
        let geom = query_with_live_dpi().ok_or_else(|| "找不到任务栏".to_string())?;
        Ok(TaskbarChrome {
            light: system_taskbar_is_light(),
            edge: geom.edge.as_str().to_string(),
        })
    }

    fn system_taskbar_is_light() -> bool {
        let key: Vec<u16> =
            "Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize"
                .encode_utf16()
                .chain([0])
                .collect();
        let value: Vec<u16> = "SystemUsesLightTheme".encode_utf16().chain([0]).collect();
        let mut data: u32 = 0;
        let mut size = std::mem::size_of::<u32>() as u32;
        let status = unsafe {
            RegGetValueW(
                HKEY_CURRENT_USER,
                key.as_ptr(),
                value.as_ptr(),
                RRF_RT_REG_DWORD,
                std::ptr::null_mut(),
                &mut data as *mut u32 as *mut _,
                &mut size,
            )
        };
        status == 0 && data != 0
    }

    fn is_shell_window(hwnd: HWND) -> bool {
        matches!(
            class_name(hwnd).as_str(),
            "Progman"
                | "WorkerW"
                | "Shell_TrayWnd"
                | "Shell_SecondaryTrayWnd"
                | "NotifyIconOverflowWindow"
                | "TopLevelWindowForOverflowXamlIsland"
        )
    }

    /// 其他程序的真全屏（盖住任务栏所在显示器）时让出，避免播放条浮在游戏上。
    fn foreign_fullscreen(monitor: PxRect) -> bool {
        let fg = unsafe { GetForegroundWindow() };
        if fg.is_null() || is_shell_window(fg) {
            return false;
        }
        if unsafe { IsIconic(fg) } != 0 {
            return false;
        }
        let mut pid = 0u32;
        unsafe { GetWindowThreadProcessId(fg, &mut pid) };
        if pid == unsafe { GetCurrentProcessId() } {
            return false;
        }
        let Some(rect) = window_rect(fg) else {
            return false;
        };
        rect.left <= monitor.left + 2
            && rect.top <= monitor.top + 2
            && rect.right >= monitor.right - 2
            && rect.bottom >= monitor.bottom - 2
    }

    fn native_hwnd(win: &tauri::WebviewWindow) -> Option<HWND> {
        let handle = win.hwnd().ok()?;
        let raw = handle.0;
        if raw.is_null() {
            None
        } else {
            Some(raw)
        }
    }

    fn flatten_corners(win: &tauri::WebviewWindow) {
        let Some(hwnd) = native_hwnd(win) else {
            return;
        };
        let pref = DWMWCP_DONOTROUND;
        unsafe {
            DwmSetWindowAttribute(
                hwnd,
                DWMWA_WINDOW_CORNER_PREFERENCE as u32,
                &pref as *const _ as *const _,
                std::mem::size_of_val(&pref) as u32,
            );
        }
    }

    fn raise(win: &tauri::WebviewWindow) {
        let Some(hwnd) = native_hwnd(win) else {
            return;
        };
        unsafe {
            SetWindowPos(
                hwnd,
                HWND_TOPMOST,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
            );
        }
    }

    /// 任务栏自动冒出来时要把条重新显示，但不能抢走当前程序的焦点。
    /// Tauri 的 show() 会 SW_SHOW 并激活窗口，所以自动恢复走 SW_SHOWNOACTIVATE。
    fn show_no_activate(win: &tauri::WebviewWindow) {
        let Some(hwnd) = native_hwnd(win) else {
            return;
        };
        unsafe { ShowWindow(hwnd, SW_SHOWNOACTIVATE) };
        raise(win);
    }

    fn hide_window(win: &tauri::WebviewWindow) {
        // 先按系统句柄藏起来。Tauri 内部的可见标记可能和真实窗口不一致，
        // 只调 hide() 会在标记已经是 false 时变成空操作。
        if let Some(hwnd) = native_hwnd(win) {
            unsafe { ShowWindow(hwnd, SW_HIDE) };
        }
        let _ = win.hide();
    }

    fn place(win: &tauri::WebviewWindow, slot: PxRect) {
        let w = slot.w().max(1) as u32;
        let h = slot.h().max(1) as u32;
        let _ = win.set_size(tauri::PhysicalSize::new(w, h));
        let _ = win.set_position(tauri::PhysicalPosition::new(slot.left, slot.top));
        raise(win);
    }

    pub fn install(app: &tauri::AppHandle) -> Result<(), String> {
        let prefs = load_prefs(app);
        let win = WebviewWindowBuilder::new(
            app,
            LABEL,
            WebviewUrl::App("index.html#taskbar-mini".into()),
        )
        .title("任务栏播放")
        .inner_size(DESIRED_WIDTH_DIP, 48.0)
        .min_inner_size(1.0, 1.0)
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
        .background_color(tauri::webview::Color(0, 0, 0, 0))
        .build()
        .map_err(|e| e.to_string())?;

        flatten_corners(&win);
        let app_for_close = app.clone();
        win.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 退出应用时系统也会对这个无边框窗口发关闭。
                // 这里只拦掉真正关掉，不能把「用户关掉了小组件」写进偏好，
                // 否则下次启动开关是关的，条就不见了。
                api.prevent_close();
                if let Some(w) = app_for_close.get_webview_window(LABEL) {
                    let _ = w.hide();
                }
            }
        });

        app.manage(TaskbarMiniState {
            wants_open: std::sync::Mutex::new(prefs.enabled),
            anchor: std::sync::Mutex::new(prefs.anchor),
            last_slot: std::sync::Mutex::new(None),
            last_chrome: std::sync::Mutex::new(None),
            activate_on_next_show: std::sync::Mutex::new(false),
        });

        if prefs.enabled {
            let _ = app.emit("taskbar-mini:visible", true);
            sync_window(app);
        }

        let watcher = app.clone();
        std::thread::spawn(move || loop {
            let wants = watcher
                .try_state::<TaskbarMiniState>()
                .map(|s| *s.wants_open.lock().unwrap())
                .unwrap_or(false);
            std::thread::sleep(Duration::from_millis(if wants { 150 } else { 700 }));
            let app = watcher.clone();
            if watcher
                .run_on_main_thread(move || sync_window(&app))
                .is_err()
            {
                break;
            }
        });

        eprintln!("[taskbar-mini] 窗口已预创建");
        Ok(())
    }

    pub fn sync_window(app: &tauri::AppHandle) {
        let Some(state) = app.try_state::<TaskbarMiniState>() else {
            return;
        };
        let Some(win) = app.get_webview_window(LABEL) else {
            return;
        };
        let wants = *state.wants_open.lock().unwrap();
        let was_visible = win.is_visible().unwrap_or(false);

        if !wants {
            if was_visible {
                hide_window(&win);
                super::super::notify_viewers(app);
            }
            return;
        }

        let Some(geom) = query_with_live_dpi() else {
            if was_visible {
                hide_window(&win);
                super::super::notify_viewers(app);
            }
            return;
        };

        let should = geom.shown && !foreign_fullscreen(geom.monitor) && geom.slot.w() >= 8 && geom.slot.h() >= 8;
        if !should {
            if was_visible {
                hide_window(&win);
                super::super::notify_viewers(app);
            }
            return;
        }

        let key = (geom.slot.left, geom.slot.top, geom.slot.right, geom.slot.bottom);
        let moved = *state.last_slot.lock().unwrap() != Some(key);
        if moved || !was_visible {
            place(&win, geom.slot);
            *state.last_slot.lock().unwrap() = Some(key);
        } else {
            // 任务栏自己也是置顶的，位置没变时仍要周期性抬到它上面。
            raise(&win);
        }

        let chrome = (system_taskbar_is_light(), geom.edge.as_str().to_string());
        let chrome_changed = *state.last_chrome.lock().unwrap() != Some(chrome.clone());
        if chrome_changed {
            *state.last_chrome.lock().unwrap() = Some(chrome.clone());
            let _ = app.emit(
                "taskbar-mini:chrome",
                TaskbarChrome {
                    light: chrome.0,
                    edge: chrome.1,
                },
            );
        }

        if !was_visible {
            let activate = std::mem::take(&mut *state.activate_on_next_show.lock().unwrap());
            if activate {
                let _ = win.show();
                raise(&win);
            } else {
                show_no_activate(&win);
            }
            let _ = app.emit("panel:request-state", ());
            super::super::notify_viewers(app);
            eprintln!(
                "[taskbar-mini] 停靠在任务栏 {} ({}, {}) {}x{}",
                geom.edge.as_str(),
                geom.slot.left,
                geom.slot.top,
                geom.slot.w(),
                geom.slot.h()
            );
        }
    }

    pub fn set_open(app: &tauri::AppHandle, open: bool) -> Result<bool, String> {
        let state = app
            .try_state::<TaskbarMiniState>()
            .ok_or_else(|| "任务栏迷你播放器未初始化".to_string())?;
        *state.wants_open.lock().unwrap() = open;
        if open {
            *state.activate_on_next_show.lock().unwrap() = true;
        } else {
            *state.last_slot.lock().unwrap() = None;
        }
        drop(state);
        save_prefs(app);
        let _ = app.emit("taskbar-mini:visible", open);
        sync_window(app);
        Ok(open)
    }

    pub fn toggle(app: &tauri::AppHandle) -> Result<bool, String> {
        let state = app
            .try_state::<TaskbarMiniState>()
            .ok_or_else(|| "任务栏迷你播放器未初始化".to_string())?;
        let next = !*state.wants_open.lock().unwrap();
        drop(state);
        set_open(app, next)
    }

    pub fn is_open(app: &tauri::AppHandle) -> bool {
        app.try_state::<TaskbarMiniState>()
            .map(|s| *s.wants_open.lock().unwrap())
            .unwrap_or(false)
    }

    pub fn nudge(_app: &tauri::AppHandle, _dx: f64, _dy: f64) -> Result<(), String> {
        // 位置跟在系统小组件旁边，不再沿任务栏拖动。
        Ok(())
    }

    #[cfg(test)]
    mod widgets_probe {
        use super::*;

        #[test]
        fn widgets_button_sits_on_the_leading_edge_when_present() {
            let class: Vec<u16> = "Shell_TrayWnd".encode_utf16().chain([0]).collect();
            let hwnd = unsafe { FindWindowW(class.as_ptr(), std::ptr::null()) };
            if hwnd.is_null() {
                return;
            }
            let Some(bar) = window_rect(hwnd) else {
                return;
            };
            let horizontal = bar.w() >= bar.h();
            let Some(far) = probe_widgets_far_edge(hwnd, bar, horizontal) else {
                return;
            };
            if horizontal {
                assert!(
                    far > bar.left + 16 && far < bar.left + bar.w() / 2,
                    "widgets right {far} bar {bar:?}"
                );
            } else {
                assert!(
                    far > bar.top + 16 && far < bar.top + bar.h() / 2,
                    "widgets bottom {far} bar {bar:?}"
                );
            }
        }
    }
}

#[cfg(not(windows))]
mod host {
    use super::*;

    pub fn install(_app: &tauri::AppHandle) -> Result<(), String> {
        Ok(())
    }

    pub fn chrome() -> Result<TaskbarChrome, String> {
        Err("任务栏迷你播放器仅支持 Windows".into())
    }

    pub fn toggle(_app: &tauri::AppHandle) -> Result<bool, String> {
        Err("任务栏迷你播放器仅支持 Windows".into())
    }

    pub fn is_open(_app: &tauri::AppHandle) -> bool {
        false
    }

    pub fn nudge(_app: &tauri::AppHandle, _dx: f64, _dy: f64) -> Result<(), String> {
        Err("任务栏迷你播放器仅支持 Windows".into())
    }

    pub fn set_open(_app: &tauri::AppHandle, _open: bool) -> Result<bool, String> {
        Err("任务栏迷你播放器仅支持 Windows".into())
    }
}

pub fn install(app: &tauri::AppHandle) -> Result<(), String> {
    host::install(app)
}

#[tauri::command]
pub fn toggle_taskbar_mini(app: tauri::AppHandle) -> Result<bool, String> {
    host::toggle(&app)
}

#[tauri::command]
pub fn is_taskbar_mini_open(app: tauri::AppHandle) -> bool {
    host::is_open(&app)
}

#[tauri::command]
pub fn taskbar_mini_chrome() -> Result<TaskbarChrome, String> {
    host::chrome()
}

#[tauri::command]
pub fn taskbar_mini_nudge(app: tauri::AppHandle, dx: f64, dy: f64) -> Result<(), String> {
    host::nudge(&app, dx, dy)
}

#[tauri::command]
pub fn taskbar_mini_end_drag(app: tauri::AppHandle) -> Result<(), String> {
    save_prefs(&app);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn r(left: i32, top: i32, right: i32, bottom: i32) -> PxRect {
        PxRect {
            left,
            top,
            right,
            bottom,
        }
    }

    #[test]
    fn centered_taskbar_pins_just_after_the_widgets_button() {
        // 本机 25H2：任务栏 1536×48，小组件右缘约 158，开始按钮 569，托盘 1196。
        let slot = horizontal_slot(r(0, 816, 1536, 864), Some(158), 569, 791, 1196, 300, 200);
        assert_eq!(slot.left, 162);
        assert_eq!(slot.w(), 300);
        assert!(slot.right < 569, "should not cover the start button, got {}", slot.right);
        assert_eq!(slot.top, 816);
        assert_eq!(slot.h(), 48);
    }

    #[test]
    fn left_aligned_icons_fall_back_beside_the_tray() {
        // 小组件几乎贴着图标区，左侧口袋放不下，就不能压住任务按钮。
        let slot = horizontal_slot(r(0, 816, 1536, 864), Some(158), 170, 900, 1196, 340, 220);
        assert!(slot.left >= 900, "should stay out of the icon row, got {}", slot.left);
        assert!(slot.right <= 1196, "should not cover the tray, got {}", slot.right);
        assert_eq!(slot.h(), 48);
    }

    #[test]
    fn virtualized_widgets_rect_maps_onto_the_physical_taskbar() {
        let bar = r(0, 816, 1536, 864);
        // 非 DPI 感知进程里看到的 125% 坐标：x=8 y=1020 190×60。
        let mapped = map_uia_rect(r(8, 1020, 198, 1080), bar).expect("mapped");
        assert_eq!(mapped.top, 816);
        assert_eq!(mapped.bottom, 864);
        assert!(mapped.right > bar.left && mapped.right < 400, "{mapped:?}");
    }

    #[test]
    fn hidden_taskbar_is_not_shown() {
        let mon = r(0, 0, 1536, 864);
        let peeking = r(0, 860, 1536, 908);
        assert!(!taskbar_is_shown(peeking, mon));
        assert!(taskbar_is_shown(r(0, 816, 1536, 864), mon));
    }

    #[test]
    fn edge_follows_the_bar() {
        let mon = r(0, 0, 1920, 1080);
        assert_eq!(edge_of(r(0, 1032, 1920, 1080), mon), Edge::Bottom);
        assert_eq!(edge_of(r(0, 0, 1920, 48), mon), Edge::Top);
        assert_eq!(edge_of(r(0, 0, 48, 1080), mon), Edge::Left);
    }
}
