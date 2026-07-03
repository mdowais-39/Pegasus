use std::path::PathBuf;
use tokio::fs;
use uuid::Uuid;

pub async fn create_statement_directory(
    statement_id: Uuid,
) -> anyhow::Result<PathBuf> {

    let path = PathBuf::from(format!(
        "storage/statements/{}",
        statement_id
    ));

    fs::create_dir_all(&path).await?;

    Ok(path)
}

/// Remove a single statement's stored files (best-effort; missing dir is fine).
pub async fn remove_statement_directory(statement_id: &str) -> anyhow::Result<()> {
    let path = PathBuf::from(format!("storage/statements/{}", statement_id));
    if fs::try_exists(&path).await.unwrap_or(false) {
        fs::remove_dir_all(&path).await?;
    }
    Ok(())
}

/// Remove every stored statement, then recreate the empty root directory.
pub async fn clear_all_statement_directories() -> anyhow::Result<()> {
    let root = PathBuf::from("storage/statements");
    if fs::try_exists(&root).await.unwrap_or(false) {
        fs::remove_dir_all(&root).await?;
    }
    fs::create_dir_all(&root).await?;
    Ok(())
}