use serde::Serialize;
use tauri::AppHandle;

use crate::app_state::AppState;

use super::organization::{
    get_organization_facts, OrganizationChannelFact, OrganizationFacts,
    OrganizationManagedAgentFact, OrganizationTeamFact,
};

const ORGANIZATION_EXPORT_SCHEMA_VERSION: u8 = 1;
const ORGANIZATION_EXPORT_SOURCE: &str = "buzz-desktop-tauri";
const ORGANIZATION_EXPORT_STALE_AFTER_MS: u64 = 5_000;

/// Portable, safe organization envelope for strict local consumers.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationExport {
    schema_version: u8,
    facts: OrganizationExportFacts,
}

/// Outcome of an owner-selected safe organization export.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationExportSaveResult {
    saved: bool,
    destination: Option<String>,
    source_revision: String,
    observed_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OrganizationExportFacts {
    schema_version: u8,
    source: &'static str,
    observed_at: String,
    stale_after_ms: u64,
    source_revision: String,
    members: Vec<OrganizationExportMember>,
    teams: Vec<OrganizationExportTeam>,
    channels: Vec<OrganizationExportChannel>,
    health: OrganizationExportHealth,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OrganizationExportMember {
    buzz_pubkey: String,
    managed_agent_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    persona_id: Option<String>,
    display_name: String,
    runtime_identities: Vec<OrganizationExportRuntimeIdentity>,
    runtime: OrganizationExportRuntime,
    messaging: OrganizationExportMessaging,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OrganizationExportRuntimeIdentity {
    mode: &'static str,
    runtime_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OrganizationExportRuntime {
    status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    runtime: Option<String>,
    backend: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    provider: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    model: Option<String>,
    parallelism: u32,
    start_on_app_launch: bool,
    needs_restart: bool,
    persona_out_of_date: bool,
    persona_orphaned: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_error_code: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OrganizationExportMessaging {
    sender_policy: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OrganizationExportTeam {
    id: String,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    persona_ids: Vec<String>,
    is_builtin: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OrganizationExportChannel {
    id: String,
    name: String,
    channel_type: String,
    visibility: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    topic: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<String>,
    member_count: i64,
    member_pubkeys: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_message_at: Option<String>,
    archived_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OrganizationExportHealth {
    state: &'static str,
    observed_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    detail: Option<String>,
}

fn portable_runtime_id(runtime: Option<String>) -> Option<String> {
    runtime.filter(|value| {
        let mut characters = value.chars();
        matches!(characters.next(), Some(first) if first.is_ascii_alphanumeric())
            && characters.count() < 128
            && value
                .chars()
                .all(|character| character.is_ascii_alphanumeric() || "._:-".contains(character))
    })
}

impl From<OrganizationManagedAgentFact> for OrganizationExportMember {
    fn from(agent: OrganizationManagedAgentFact) -> Self {
        let managed_agent_id = agent.id;
        Self {
            buzz_pubkey: agent.pubkey,
            runtime_identities: vec![OrganizationExportRuntimeIdentity {
                mode: "buzz",
                runtime_id: managed_agent_id.clone(),
            }],
            managed_agent_id,
            persona_id: agent.persona_id,
            display_name: agent.display_name,
            runtime: OrganizationExportRuntime {
                status: agent.status,
                runtime: portable_runtime_id(agent.runtime),
                backend: agent.backend,
                provider: agent.provider,
                model: agent.model,
                parallelism: agent.parallelism,
                start_on_app_launch: agent.start_on_app_launch,
                needs_restart: agent.needs_restart,
                persona_out_of_date: agent.persona_out_of_date,
                persona_orphaned: agent.persona_orphaned,
                last_error_code: agent.last_error_code,
            },
            messaging: OrganizationExportMessaging {
                sender_policy: agent.sender_policy,
            },
        }
    }
}

impl From<OrganizationTeamFact> for OrganizationExportTeam {
    fn from(team: OrganizationTeamFact) -> Self {
        Self {
            id: team.id,
            name: team.name,
            description: team.description,
            persona_ids: team.persona_ids,
            is_builtin: team.is_builtin,
            updated_at: Some(team.updated_at),
        }
    }
}

impl From<OrganizationChannelFact> for OrganizationExportChannel {
    fn from(channel: OrganizationChannelFact) -> Self {
        Self {
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
        }
    }
}

fn export_organization_facts(facts: OrganizationFacts) -> OrganizationExport {
    let rejected_count = facts.agents.rejected_count;
    let health = if rejected_count == 0 {
        OrganizationExportHealth {
            state: "connected",
            observed_at: facts.observed_at.clone(),
            detail: None,
        }
    } else {
        OrganizationExportHealth {
            state: "degraded",
            observed_at: facts.observed_at.clone(),
            detail: Some(format!(
                "Rejected {rejected_count} malformed or duplicate managed-agent identities."
            )),
        }
    };

    OrganizationExport {
        schema_version: ORGANIZATION_EXPORT_SCHEMA_VERSION,
        facts: OrganizationExportFacts {
            schema_version: ORGANIZATION_EXPORT_SCHEMA_VERSION,
            source: ORGANIZATION_EXPORT_SOURCE,
            observed_at: facts.observed_at,
            stale_after_ms: ORGANIZATION_EXPORT_STALE_AFTER_MS,
            source_revision: facts.source_revision,
            members: facts.agents.agents.into_iter().map(Into::into).collect(),
            teams: facts.teams.into_iter().map(Into::into).collect(),
            channels: facts.channels.into_iter().map(Into::into).collect(),
            health,
        },
    }
}

/// Return the portable organization envelope without rereading source stores.
#[tauri::command]
pub async fn get_organization_export(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<OrganizationExport, String> {
    Ok(export_organization_facts(
        get_organization_facts(app, state).await?,
    ))
}

/// Save the exact safe organization envelope to an owner-selected JSON file.
/// The command never reads a private store, copies to the clipboard, or uploads
/// the snapshot. Cancelling the native dialog is a successful no-op.
#[tauri::command]
pub async fn export_safe_organization_snapshot(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<OrganizationExportSaveResult, String> {
    let export = export_organization_facts(get_organization_facts(app.clone(), state).await?);
    let source_revision = export.facts.source_revision.clone();
    let observed_at = export.facts.observed_at.clone();
    let mut bytes = serde_json::to_vec_pretty(&export)
        .map_err(|error| format!("Could not serialize safe organization snapshot: {error}"))?;
    bytes.push(b'\n');

    let destination = super::export_util::save_restricted_bytes_with_dialog(
        &app,
        "buzz-organization-snapshot.json",
        "JSON document",
        &["json"],
        &bytes,
    )
    .await?;

    Ok(OrganizationExportSaveResult {
        saved: destination.is_some(),
        destination: destination.map(|path| path.display().to_string()),
        source_revision,
        observed_at,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::organization::OrganizationManagedAgentFacts;

    fn safe_facts(rejected_count: usize) -> OrganizationFacts {
        OrganizationFacts {
            schema_version: 1,
            source_revision: "safe-revision".to_string(),
            observed_at: "2026-08-20T17:00:00Z".to_string(),
            agents: OrganizationManagedAgentFacts {
                agents: vec![OrganizationManagedAgentFact {
                    id: format!("buzz-agent:{}", "a".repeat(64)),
                    pubkey: "a".repeat(64),
                    display_name: "Builder".to_string(),
                    persona_id: Some("builder".to_string()),
                    team_id: Some("agent-tower-core".to_string()),
                    runtime: Some("goose".to_string()),
                    status: "running".to_string(),
                    backend: "local".to_string(),
                    provider: None,
                    model: None,
                    parallelism: 1,
                    start_on_app_launch: false,
                    needs_restart: false,
                    persona_out_of_date: false,
                    persona_orphaned: false,
                    last_error_code: None,
                    sender_policy: "owner-only".to_string(),
                    updated_at: "2026-08-20T16:59:00Z".to_string(),
                }],
                rejected_count,
            },
            teams: vec![OrganizationTeamFact {
                id: "agent-tower-core".to_string(),
                name: "Agent Tower Core".to_string(),
                description: None,
                persona_ids: vec!["builder".to_string()],
                is_builtin: false,
                updated_at: "2026-08-20T16:59:00Z".to_string(),
            }],
            channels: vec![OrganizationChannelFact {
                id: "11111111-1111-4111-8111-111111111111".to_string(),
                name: "agent-tower-control-plane".to_string(),
                channel_type: "stream".to_string(),
                visibility: "private".to_string(),
                description: String::new(),
                topic: None,
                purpose: None,
                member_count: 1,
                member_pubkeys: vec!["a".repeat(64)],
                last_message_at: None,
                archived_at: None,
            }],
        }
    }

    #[test]
    fn export_matches_the_portable_v1_contract_without_prefixed_source_ids() {
        let value = serde_json::to_value(export_organization_facts(safe_facts(0)))
            .expect("export should serialize");
        let facts = &value["facts"];
        let member = &facts["members"][0];

        assert_eq!(value["schemaVersion"], 1);
        assert_eq!(facts["schemaVersion"], 1);
        assert_eq!(facts["source"], "buzz-desktop-tauri");
        assert_eq!(facts["staleAfterMs"], 5_000);
        assert_eq!(facts["health"]["state"], "connected");
        assert_eq!(facts["teams"][0]["id"], "agent-tower-core");
        assert_eq!(
            facts["channels"][0]["id"],
            "11111111-1111-4111-8111-111111111111"
        );
        assert_eq!(
            member["managedAgentId"],
            member["runtimeIdentities"][0]["runtimeId"]
        );
        assert_eq!(member["runtimeIdentities"][0]["mode"], "buzz");
        assert_eq!(member["runtime"]["runtime"], "goose");
        assert!(facts["health"].get("detail").is_none());
        assert!(facts["teams"][0].get("description").is_none());
        assert_eq!(facts["channels"][0]["archivedAt"], serde_json::Value::Null);
    }

    #[test]
    fn export_drops_non_portable_runtime_values() {
        for runtime in [
            "/usr/local/bin/goose",
            "../goose",
            r"C:\\tools\\goose.exe",
            "goose --unsafe",
            "",
        ] {
            let mut facts = safe_facts(0);
            facts.agents.agents[0].runtime = Some(runtime.to_string());
            let value = serde_json::to_value(export_organization_facts(facts))
                .expect("export should serialize");
            assert!(
                value["facts"]["members"][0]["runtime"]
                    .get("runtime")
                    .is_none(),
                "runtime must be omitted: {runtime}"
            );
        }
    }

    #[test]
    fn rejected_source_identities_degrade_health_without_leaking_details() {
        let value = serde_json::to_value(export_organization_facts(safe_facts(2)))
            .expect("export should serialize");
        assert_eq!(value["facts"]["health"]["state"], "degraded");
        assert_eq!(
            value["facts"]["health"]["detail"],
            "Rejected 2 malformed or duplicate managed-agent identities."
        );
    }
}
