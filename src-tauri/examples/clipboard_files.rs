//! Prints image paths currently on the Windows clipboard as CF_HDROP.
//!
//! Mirrors the `read_clipboard_files` command so the Win32 usage can be
//! exercised without launching the app:
//!
//! ```powershell
//! Set-Clipboard -LiteralPath C:\some\photo.jpg
//! cargo run --example clipboard_files
//! ```
fn main() {
    #[cfg(windows)]
    {
        match read() {
            Ok(paths) if paths.is_empty() => println!("clipboard holds no CF_HDROP file list"),
            Ok(paths) => {
                println!("{} path(s):", paths.len());
                for path in paths {
                    println!("  {path}");
                }
            }
            Err(error) => println!("error: {error}"),
        }
    }
    #[cfg(not(windows))]
    println!("windows only");
}

#[cfg(windows)]
fn read() -> Result<Vec<String>, String> {
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
