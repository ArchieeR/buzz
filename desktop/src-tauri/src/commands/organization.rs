use std::collections::HashMap;
use tauri::AppHandle;

use crate::{
    app_state::AppState,
    managed_agents::{
        build_managed_agent_summary, load_global_agent_config, load_managed_agents, load_personas,
        BackendKind, ManagedAgentSummary, RespondTo,
    },
};

/// Safe, purpose-built managed-agent projection for the Organization surface.
///
/// Keep this type narrow: `ManagedAgentSummary` also contains prompts, environment
/// variables, relay configuration, commands, allowlists, log paths and raw errors.
/// Those operational fields must never enter Organization browser state.
#[derive(Debug, Clone, serde::Serialize)]
pub struct OrganizationManagedAgentFact {
    pub id: String,
    pub pubkey: String,
    pub display_name: String,
    pub persona_id: Option<String>,
    pub team_id: Option<String>,
    pub runtime: Option<String>,
    pub status: String,
    pub backend: String,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub parallelism: u32,
    pub start_on_app_launch: bool,
    pub needs_restart: bool,
    pub persona_out_of_date: bool,
    pub persona_orphaned: bool,
    pub last_error_code: Option<i64>,
    pub sender_policy: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct OrganizationManagedAgentFacts {
    pub agents: Vec<OrganizationManagedAgentFact>,
    pub rejected_count: usize,
}

impl From<ManagedAgentSummary> for OrganizationManagedAgentFact {
    fn from(summary: ManagedAgentSummary) -> Self {
        let backend = match summary.backend {
            BackendKind::Local => "local",
            BackendKind::Provider { .. } => "provider",
        };
        let sender_policy = match summary.respond_to {
            RespondTo::OwnerOnly => "owner-only",
            RespondTo::Allowlist => "allowlist",
            RespondTo::Anyone => "anyone",
        };

        Self {
            id: format!("buzz-agent:{}", summary.pubkey),
            pubkey: summary.pubkey,
            display_name: summary.name,
            persona_id: summary.persona_id,
            team_id: summary.team_id,
            runtime: summary.runtime,
            status: summary.status,
            backend: backend.to_string(),
            provider: summary.provider,
            model: summary.model,
            parallelism: summary.parallelism,
            start_on_app_launch: summary.start_on_app_launch,
            needs_restart: summary.needs_restart,
            persona_out_of_date: summary.persona_out_of_date,
            persona_orphaned: summary.persona_orphaned,
            last_error_code: summary.last_error_code,
            sender_policy: sender_policy.to_string(),
            updated_at: summary.updated_at,
        }
    }
}

fn project_organization_agents(
    summaries: Vec<ManagedAgentSummary>,
) -> OrganizationManagedAgentFacts {
    let mut valid_summaries = Vec::with_capacity(summaries.len());
    let mut rejected_count = 0;
    for mut summary in summaries {
        summary.pubkey.make_ascii_lowercase();
        if summary.pubkey.len() == 64 && summary.pubkey.bytes().all(|byte| byte.is_ascii_hexdigit())
        {
            valid_summaries.push(summary);
        } else {
            rejected_count += 1;
        }
    }
    let mut identity_counts = HashMap::new();
    for summary in &valid_summaries {
        *identity_counts.entry(summary.pubkey.clone()).or_insert(0) += 1;
    }
    let mut agents = Vec::with_capacity(valid_summaries.len());
    for summary in valid_summaries {
        if identity_counts.get(&summary.pubkey) == Some(&1) {
            agents.push(OrganizationManagedAgentFact::from(summary));
        } else {
            rejected_count += 1;
        }
    }
    OrganizationManagedAgentFacts {
        agents,
        rejected_count,
    }
}

async fn read_organization_managed_agent_summaries(
    app: AppHandle,
) -> Result<Vec<ManagedAgentSummary>, String> {
    use tauri::Manager;

    tokio::task::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let _store_guard = state
            .managed_agents_store_lock
            .lock()
            .map_err(|error| error.to_string())?;
        let records = load_managed_agents(&app)?;
        let runtimes = state
            .managed_agent_processes
            .lock()
            .map_err(|error| error.to_string())?;
        let personas = load_personas(&app).unwrap_or_default();
        let global_config = load_global_agent_config(&app).unwrap_or_default();

        records
            .iter()
            .map(|record| {
                build_managed_agent_summary(&app, record, &runtimes, &personas, &global_config)
            })
            .collect()
    })
    .await
    .map_err(|error| format!("spawn_blocking failed: {error}"))?
}

#[tauri::command]
pub async fn list_organization_managed_agents(
    app: AppHandle,
) -> Result<OrganizationManagedAgentFacts, String> {
    Ok(project_organization_agents(
        read_organization_managed_agent_summaries(app).await?,
    ))
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use crate::managed_agents::{BackendKind, ManagedAgentSummary, RespondTo};

    use super::project_organization_agents;

    #[test]
    fn organization_agent_fact_serialization_is_an_explicit_safe_projection() {
        let pubkey = "a".repeat(64);
        let mut env_vars = BTreeMap::new();
        env_vars.insert("SECRET".to_string(), "must not survive".to_string());
        let summary = ManagedAgentSummary {
            pubkey: "A".repeat(64),
            name: "Reviewer".to_string(),
            persona_id: Some("reviewer".to_string()),
            runtime: Some("claude".to_string()),
            team_id: Some("engineering".to_string()),
            relay_url: "wss://private.example".to_string(),
            acp_command: "secret-acp-command".to_string(),
            agent_command: "secret-agent-command".to_string(),
            agent_command_override: None,
            agent_args: vec!["--secret".to_string()],
            mcp_command: "secret-mcp-command".to_string(),
            turn_timeout_seconds: 300,
            idle_timeout_seconds: None,
            max_turn_duration_seconds: None,
            parallelism: 1,
            system_prompt: Some("must not survive".to_string()),
            avatar_url: None,
            model: Some("claude-opus".to_string()),
            model_source: None,
            provider: Some("anthropic".to_string()),
            persona_out_of_date: false,
            persona_orphaned: false,
            needs_restart: false,
            restart_diff: vec![],
            env_vars,
            backend: BackendKind::Local,
            backend_agent_id: None,
            status: "running".to_string(),
            pid: Some(123),
            created_at: "2026-08-11T00:00:00Z".to_string(),
            updated_at: "2026-08-11T00:00:00Z".to_string(),
            last_started_at: None,
            last_stopped_at: None,
            last_exit_code: None,
            last_error: Some("must not survive".to_string()),
            last_error_code: None,
            start_on_app_launch: false,
            auto_restart_on_config_change: false,
            log_path: "/private/log".to_string(),
            respond_to: RespondTo::OwnerOnly,
            respond_to_allowlist: vec!["b".repeat(64)],
        };
        let mut invalid_summary = summary.clone();
        invalid_summary.pubkey = "legacy-record".to_string();
        let projection = project_organization_agents(vec![summary.clone(), invalid_summary]);
        assert_eq!(projection.rejected_count, 1);
        let fact = projection
            .agents
            .into_iter()
            .next()
            .expect("valid summary should survive projection");
        let value = serde_json::to_value(fact).expect("projection should serialize");
        let object = value.as_object().expect("projection should be an object");

        assert_eq!(
            object.get("id").and_then(|value| value.as_str()),
            Some(format!("buzz-agent:{pubkey}").as_str())
        );
        for forbidden in [
            "system_prompt",
            "env_vars",
            "relay_url",
            "respond_to_allowlist",
            "log_path",
            "agent_command",
            "mcp_command",
        ] {
            assert!(
                !object.contains_key(forbidden),
                "forbidden field leaked: {forbidden}"
            );
        }

        let duplicate_projection = project_organization_agents(vec![summary.clone(), summary]);
        assert!(duplicate_projection.agents.is_empty());
        assert_eq!(duplicate_projection.rejected_count, 2);
    }
}
