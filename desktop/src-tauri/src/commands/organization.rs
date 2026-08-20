use sha2::{Digest, Sha256};
use std::collections::HashMap;
use tauri::AppHandle;

use crate::{
    app_state::AppState,
    managed_agents::{
        load_managed_agents_public, load_teams, BackendKind, ManagedAgentRecord, RespondTo,
        TeamRecord,
    },
    models::ChannelInfo,
    util::now_iso,
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

#[derive(Debug, Clone, serde::Serialize)]
pub struct OrganizationTeamFact {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub persona_ids: Vec<String>,
    pub is_builtin: bool,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct OrganizationChannelFact {
    pub id: String,
    pub name: String,
    pub channel_type: String,
    pub visibility: String,
    pub description: String,
    pub topic: Option<String>,
    pub purpose: Option<String>,
    pub member_count: i64,
    pub member_pubkeys: Vec<String>,
    pub last_message_at: Option<String>,
    pub archived_at: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct OrganizationFacts {
    pub schema_version: u8,
    pub source_revision: String,
    pub observed_at: String,
    pub agents: OrganizationManagedAgentFacts,
    pub teams: Vec<OrganizationTeamFact>,
    pub channels: Vec<OrganizationChannelFact>,
}

impl From<ManagedAgentRecord> for OrganizationManagedAgentFact {
    fn from(record: ManagedAgentRecord) -> Self {
        let backend = match record.backend {
            BackendKind::Local => "local",
            BackendKind::Provider { .. } => "provider",
        };
        let sender_policy = match record.respond_to {
            RespondTo::OwnerOnly => "owner-only",
            RespondTo::Allowlist => "allowlist",
            RespondTo::Anyone => "anyone",
        };

        Self {
            id: format!("buzz-agent:{}", record.pubkey),
            pubkey: record.pubkey,
            display_name: record.name,
            persona_id: record.persona_id,
            team_id: record.team_id,
            // Export the stable runtime ID only. `agent_command_override` may be a
            // custom executable or absolute path and must not enter browser state.
            runtime: record.runtime,
            status: if record.backend_agent_id.is_some() {
                "deployed".to_string()
            } else if record.runtime_pid.is_some() {
                "running".to_string()
            } else {
                "stopped".to_string()
            },
            backend: backend.to_string(),
            provider: record.provider,
            model: record.model,
            parallelism: record.parallelism,
            start_on_app_launch: record.start_on_app_launch,
            needs_restart: false,
            persona_out_of_date: false,
            persona_orphaned: false,
            last_error_code: record.last_error_code,
            sender_policy: sender_policy.to_string(),
            updated_at: record.updated_at,
        }
    }
}

#[cfg(test)]
impl From<crate::managed_agents::ManagedAgentSummary> for OrganizationManagedAgentFact {
    fn from(summary: crate::managed_agents::ManagedAgentSummary) -> Self {
        let backend = match summary.backend {
            BackendKind::Local => "local",
            BackendKind::Provider { .. } => "provider",
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
            sender_policy: summary.respond_to.as_str().to_string(),
            updated_at: summary.updated_at,
        }
    }
}

fn project_organization_agents<T>(summaries: Vec<T>) -> OrganizationManagedAgentFacts
where
    T: Into<OrganizationManagedAgentFact>,
{
    let mut valid_summaries = Vec::with_capacity(summaries.len());
    let mut rejected_count = 0;
    for summary in summaries {
        let mut fact = summary.into();
        fact.pubkey.make_ascii_lowercase();
        fact.id = format!("buzz-agent:{}", fact.pubkey);
        if fact.pubkey.len() == 64 && fact.pubkey.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            valid_summaries.push(fact);
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
            agents.push(summary);
        } else {
            rejected_count += 1;
        }
    }
    OrganizationManagedAgentFacts {
        agents,
        rejected_count,
    }
}

fn build_organization_facts(
    agents: OrganizationManagedAgentFacts,
    teams: Vec<TeamRecord>,
    channels: Vec<ChannelInfo>,
    observed_at: String,
) -> Result<OrganizationFacts, String> {
    let mut agents = agents;
    agents.agents.sort_by(|left, right| left.id.cmp(&right.id));
    let mut teams = teams
        .into_iter()
        .map(|team| OrganizationTeamFact {
            id: team.id,
            name: team.name,
            description: team.description,
            persona_ids: team.persona_ids,
            is_builtin: team.is_builtin,
            updated_at: team.updated_at,
        })
        .collect::<Vec<_>>();
    teams.sort_by(|left, right| left.id.cmp(&right.id));
    for team in &mut teams {
        team.persona_ids.sort();
        team.persona_ids.dedup();
    }
    let mut channels = channels
        .into_iter()
        .map(|channel| OrganizationChannelFact {
            id: channel.id,
            name: channel.name,
            channel_type: channel.channel_type,
            visibility: channel.visibility,
            description: channel.description,
            topic: channel.topic,
            purpose: channel.purpose,
            member_count: channel.member_count,
            member_pubkeys: channel.member_pubkeys,
            last_message_at: channel.last_message_at,
            archived_at: channel.archived_at,
        })
        .collect::<Vec<_>>();
    channels.sort_by(|left, right| left.id.cmp(&right.id));
    for channel in &mut channels {
        channel.member_pubkeys.sort();
        channel.member_pubkeys.dedup();
    }
    let canonical = serde_json::to_vec(&(1_u8, &agents, &teams, &channels))
        .map_err(|error| format!("failed to serialize organization facts: {error}"))?;
    Ok(OrganizationFacts {
        schema_version: 1,
        source_revision: hex::encode(Sha256::digest(canonical)),
        observed_at,
        agents,
        teams,
        channels,
    })
}

async fn read_organization_managed_agent_summaries(
    app: AppHandle,
) -> Result<Vec<ManagedAgentRecord>, String> {
    use tauri::Manager;

    tokio::task::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let _store_guard = state
            .managed_agents_store_lock
            .lock()
            .map_err(|error| error.to_string())?;
        let records = load_managed_agents_public(&app)?;
        Ok(records)
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

#[tauri::command]
pub async fn get_organization_facts(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<OrganizationFacts, String> {
    let agents =
        project_organization_agents(read_organization_managed_agent_summaries(app.clone()).await?);
    let teams = {
        use tauri::Manager;
        let app = app.clone();
        tokio::task::spawn_blocking(move || {
            let state = app.state::<AppState>();
            let _store_guard = state
                .managed_agents_store_lock
                .lock()
                .map_err(|error| error.to_string())?;
            load_teams(&app)
        })
        .await
        .map_err(|error| format!("spawn_blocking failed: {error}"))??
    };
    let channels = super::channels::get_channels(state).await?;
    build_organization_facts(agents, teams, channels, now_iso())
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use crate::{
        managed_agents::{BackendKind, ManagedAgentSummary, RespondTo, TeamRecord},
        models::ChannelInfo,
    };

    use super::{
        build_organization_facts, project_organization_agents, OrganizationManagedAgentFacts,
    };

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

    #[test]
    fn organization_facts_project_safe_teams_and_channels_with_a_stable_revision() {
        let team = TeamRecord {
            id: "engineering".to_string(),
            name: "Engineering".to_string(),
            description: Some("Product engineering".to_string()),
            instructions: Some("must not survive".to_string()),
            persona_ids: vec!["reviewer".to_string()],
            is_builtin: false,
            source_dir: Some("/private/team".into()),
            is_symlink: false,
            symlink_target: None,
            version: None,
            created_at: "2026-08-19T17:00:00Z".to_string(),
            updated_at: "2026-08-19T18:00:00Z".to_string(),
        };
        let channel = ChannelInfo {
            id: "11111111-1111-4111-8111-111111111111".to_string(),
            name: "engineering".to_string(),
            channel_type: "stream".to_string(),
            visibility: "private".to_string(),
            description: "Engineering coordination".to_string(),
            topic: Some("Ship safely".to_string()),
            purpose: Some("Coordinate reviewed work".to_string()),
            member_count: 1,
            member_pubkeys: vec!["a".repeat(64)],
            last_message_at: Some("2026-08-19T17:59:00Z".to_string()),
            archived_at: None,
            participants: vec!["must not survive".to_string()],
            participant_pubkeys: vec!["b".repeat(64)],
            is_member: true,
            ttl_seconds: Some(3_600),
            ttl_deadline: None,
        };

        let first = build_organization_facts(
            OrganizationManagedAgentFacts {
                agents: vec![],
                rejected_count: 0,
            },
            vec![team.clone()],
            vec![channel],
            "2026-08-19T18:00:00Z".to_string(),
        )
        .expect("safe facts should assemble");
        let second = build_organization_facts(
            OrganizationManagedAgentFacts {
                agents: vec![],
                rejected_count: 0,
            },
            vec![team],
            vec![],
            "2026-08-19T19:00:00Z".to_string(),
        )
        .expect("safe facts should assemble");

        let value = serde_json::to_value(&first).expect("facts should serialize");
        let team = &value["teams"][0];
        assert!(team.get("instructions").is_none());
        assert!(team.get("source_dir").is_none());
        let channel = &value["channels"][0];
        assert!(channel.get("participants").is_none());
        assert!(channel.get("ttl_seconds").is_none());
        assert_ne!(first.source_revision, second.source_revision);
        assert_eq!(first.schema_version, 1);
    }

    #[test]
    fn organization_revision_is_stable_across_source_order() {
        let team = |id: &str| TeamRecord {
            id: id.to_string(),
            name: id.to_string(),
            description: None,
            instructions: None,
            persona_ids: vec![],
            is_builtin: false,
            source_dir: None,
            is_symlink: false,
            symlink_target: None,
            version: None,
            created_at: "2026-08-19T17:00:00Z".to_string(),
            updated_at: "2026-08-19T18:00:00Z".to_string(),
        };
        let first = build_organization_facts(
            OrganizationManagedAgentFacts {
                agents: vec![],
                rejected_count: 0,
            },
            vec![team("b"), team("a")],
            vec![],
            "2026-08-19T18:00:00Z".to_string(),
        )
        .expect("facts should assemble");
        let second = build_organization_facts(
            OrganizationManagedAgentFacts {
                agents: vec![],
                rejected_count: 0,
            },
            vec![team("a"), team("b")],
            vec![],
            "2026-08-19T19:00:00Z".to_string(),
        )
        .expect("facts should assemble");
        assert_eq!(first.source_revision, second.source_revision);
    }
}
