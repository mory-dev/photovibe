use serde::Serialize;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            sample_screen_color,
            pin_cursor,
            read_clipboard_files,
            list_system_fonts,
            app_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(Serialize)]
struct ScreenColor {
    r: u8,
    g: u8,
    b: u8,
    a: f32,
}

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn sample_screen_color() -> Result<ScreenColor, String> {
    #[cfg(windows)]
    {
        return windows_sample_screen_color();
    }
    #[cfg(not(windows))]
    {
        Err("Screen sampling is only available on Windows".into())
    }
}

#[tauri::command]
fn pin_cursor(x: i32, y: i32) -> Result<(), String> {
    #[cfg(windows)]
    {
        return windows_pin_cursor(x, y);
    }
    #[cfg(not(windows))]
    {
        let _ = (x, y);
        Ok(())
    }
}

#[cfg(windows)]
fn windows_pin_cursor(x: i32, y: i32) -> Result<(), String> {
    #[link(name = "user32")]
    extern "system" {
        fn SetCursorPos(x: i32, y: i32) -> i32;
    }

    unsafe {
        if SetCursorPos(x, y) == 0 {
            return Err("Could not pin the cursor".into());
        }
    }
    Ok(())
}

/// File Explorer puts a CF_HDROP file list on the clipboard rather than a
/// bitmap, which the clipboard plugin cannot see. Returns the dropped paths so
/// the frontend can load the first image among them.
#[tauri::command]
fn read_clipboard_files() -> Result<Vec<String>, String> {
    #[cfg(windows)]
    {
        return windows_read_clipboard_files();
    }
    #[cfg(not(windows))]
    {
        Ok(Vec::new())
    }
}

#[cfg(windows)]
fn windows_read_clipboard_files() -> Result<Vec<String>, String> {
    use std::ffi::c_void;

    const CF_HDROP: u32 = 15;

    #[link(name = "user32")]
    extern "system" {
        fn OpenClipboard(hwnd: *mut c_void) -> i32;
        fn CloseClipboard() -> i32;
        fn GetClipboardData(format: u32) -> *mut c_void;
        fn IsClipboardFormatAvailable(format: u32) -> i32;
    }

    #[link(name = "shell32")]
    extern "system" {
        fn DragQueryFileW(drop: *mut c_void, index: u32, buffer: *mut u16, size: u32) -> u32;
    }

    unsafe {
        if IsClipboardFormatAvailable(CF_HDROP) == 0 {
            return Ok(Vec::new());
        }
        if OpenClipboard(std::ptr::null_mut()) == 0 {
            return Err("Could not open the clipboard".into());
        }

        let handle = GetClipboardData(CF_HDROP);
        if handle.is_null() {
            CloseClipboard();
            return Ok(Vec::new());
        }

        let count = DragQueryFileW(handle, u32::MAX, std::ptr::null_mut(), 0);
        let mut paths = Vec::with_capacity(count as usize);
        for index in 0..count {
            // Ask for the length first, then read into a buffer of that size.
            let len = DragQueryFileW(handle, index, std::ptr::null_mut(), 0);
            if len == 0 {
                continue;
            }
            let mut buffer = vec![0u16; len as usize + 1];
            let written = DragQueryFileW(handle, index, buffer.as_mut_ptr(), buffer.len() as u32);
            if written == 0 {
                continue;
            }
            buffer.truncate(written as usize);
            paths.push(String::from_utf16_lossy(&buffer));
        }

        CloseClipboard();
        Ok(paths)
    }
}

#[tauri::command]
fn list_system_fonts() -> Vec<String> {
    #[cfg(windows)]
    {
        windows_list_fonts()
    }
    #[cfg(not(windows))]
    {
        vec![
            "Segoe UI".into(),
            "Arial".into(),
            "Georgia".into(),
            "Times New Roman".into(),
            "Courier New".into(),
            "Verdana".into(),
        ]
    }
}

#[cfg(windows)]
fn windows_sample_screen_color() -> Result<ScreenColor, String> {
    #[repr(C)]
    struct Point {
        x: i32,
        y: i32,
    }

    #[link(name = "user32")]
    extern "system" {
        fn GetCursorPos(point: *mut Point) -> i32;
        fn GetDC(hwnd: *mut core::ffi::c_void) -> *mut core::ffi::c_void;
        fn ReleaseDC(hwnd: *mut core::ffi::c_void, hdc: *mut core::ffi::c_void) -> i32;
    }

    #[link(name = "gdi32")]
    extern "system" {
        fn GetPixel(hdc: *mut core::ffi::c_void, x: i32, y: i32) -> u32;
    }

    unsafe {
        let mut point = Point { x: 0, y: 0 };
        if GetCursorPos(&mut point) == 0 {
            return Err("Could not read the cursor position".into());
        }
        let hdc = GetDC(std::ptr::null_mut());
        if hdc.is_null() {
            return Err("Could not read the screen".into());
        }
        let color = GetPixel(hdc, point.x, point.y);
        ReleaseDC(std::ptr::null_mut(), hdc);
        if color == 0xFFFFFFFF {
            return Err("Could not sample that pixel".into());
        }
        Ok(ScreenColor {
            r: (color & 0xFF) as u8,
            g: ((color >> 8) & 0xFF) as u8,
            b: ((color >> 16) & 0xFF) as u8,
            a: 1.0,
        })
    }
}

#[cfg(windows)]
fn windows_list_fonts() -> Vec<String> {
    use std::collections::BTreeSet;
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;

    let mut names = BTreeSet::new();
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(fonts) = hklm.open_subkey("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts") {
        for (name, _) in fonts.enum_values().flatten() {
            let family = name
                .replace(" (TrueType)", "")
                .replace(" (OpenType)", "")
                .replace(" (All res)", "")
                .trim()
                .to_string();
            if !family.is_empty() {
                names.insert(family);
            }
        }
    }
    if names.is_empty() {
        names.insert("Segoe UI".into());
        names.insert("Arial".into());
    }
    names.into_iter().collect()
}
