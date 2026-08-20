use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// Show a save-file dialog with a custom filter and return the chosen path,
/// or `None` when the user cancelled. Selection only — no write.
pub async fn pick_save_path(
    app: &AppHandle,
    suggested_filename: &str,
    filter_name: &str,
    extensions: &[&str],
) -> Result<Option<std::path::PathBuf>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter(filter_name, extensions)
        .set_file_name(suggested_filename)
        .save_file(move |path| {
            let _ = tx.send(path);
        });

    let selected = rx.await.map_err(|_| "dialog cancelled".to_string())?;
    let file_path = match selected {
        Some(p) => p,
        None => return Ok(None),
    };

    let dest = file_path
        .as_path()
        .ok_or_else(|| "Save dialog returned an invalid path".to_string())?;
    Ok(Some(dest.to_path_buf()))
}

/// Show a save-file dialog with a custom filter and write `data` to the chosen
/// path. Returns `Ok(true)` when the file was written, `Ok(false)` when the
/// user cancelled the dialog.
///
/// NOT for secrets: the write is plain `std::fs::write` (no atomic commit, no
/// 0o600). Secret exports go through `pick_save_path` and a dedicated
/// secret-file writer such as `key_backup::write_portable_backup_file`.
pub async fn save_bytes_with_dialog(
    app: &AppHandle,
    suggested_filename: &str,
    filter_name: &str,
    extensions: &[&str],
    data: &[u8],
) -> Result<bool, String> {
    let dest = match pick_save_path(app, suggested_filename, filter_name, extensions).await? {
        Some(p) => p,
        None => return Ok(false),
    };

    std::fs::write(dest, data).map_err(|e| format!("Failed to write file: {e}"))?;

    Ok(true)
}

/// Atomically write owner-readable bytes to a path selected by the native save
/// dialog. Returns the destination, or `None` when the owner cancels.
///
/// This is suitable for deliberately exportable local snapshots. It does not
/// make the file secret, publish it, or grant another process access. On Unix,
/// owner-only permissions are applied before any bytes reach disk.
pub async fn save_restricted_bytes_with_dialog(
    app: &AppHandle,
    suggested_filename: &str,
    filter_name: &str,
    extensions: &[&str],
    data: &[u8],
) -> Result<Option<std::path::PathBuf>, String> {
    let Some(dest) = pick_save_path(app, suggested_filename, filter_name, extensions).await? else {
        return Ok(None);
    };
    write_restricted_bytes(&dest, data)?;
    Ok(Some(dest))
}

fn write_restricted_bytes(path: &std::path::Path, data: &[u8]) -> Result<(), String> {
    use atomic_write_file::AtomicWriteFile;
    use std::io::Write as _;

    let resolved = std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    let mut file = AtomicWriteFile::open(&resolved)
        .map_err(|error| format!("Could not open export destination: {error}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        file.set_permissions(std::fs::Permissions::from_mode(0o600))
            .map_err(|error| format!("Could not restrict export permissions: {error}"))?;
    }
    file.write_all(data)
        .map_err(|error| format!("Could not write organization export: {error}"))?;
    file.commit()
        .map_err(|error| format!("Could not commit organization export: {error}"))
}

#[cfg(test)]
mod tests {
    use super::write_restricted_bytes;

    #[test]
    fn restricted_writer_commits_exact_bytes() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("organization.json");
        write_restricted_bytes(&path, br#"{"schemaVersion":1}"#).expect("write");
        assert_eq!(
            std::fs::read(&path).expect("read"),
            br#"{"schemaVersion":1}"#
        );
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt as _;
            assert_eq!(
                std::fs::metadata(path)
                    .expect("metadata")
                    .permissions()
                    .mode()
                    & 0o777,
                0o600
            );
        }
    }

    #[test]
    fn restricted_writer_reports_invalid_destination() {
        let dir = tempfile::tempdir().expect("tempdir");
        let error = write_restricted_bytes(dir.path(), b"payload").expect_err("must fail");
        assert!(error.contains("export destination") || error.contains("commit"));
    }
}
