#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

// ── helpers ──────────────────────────────────────────────────────────────────

fn setup() -> (Env, SupplyLinkContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, SupplyLinkContract);
    let client = SupplyLinkContractClient::new(&env, &contract_id);
    (env, client)
}

fn str_of_len(env: &Env, len: usize) -> String {
    String::from_str(env, &"a".repeat(len))
}

// ── 1. Malformed / oversized payload rejection ────────────────────────────────

#[test]
fn test_id_at_max_length_accepted() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let id = str_of_len(&env, 128);
    client.register_product(&id, &String::from_str(&env, "Name"), &String::from_str(&env, "Origin"), &owner, &1);
    assert!(client.product_exists(&id));
}

#[test]
#[should_panic(expected = "id exceeds max length")]
fn test_id_over_max_length_rejected() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    client.register_product(
        &str_of_len(&env, 129),
        &String::from_str(&env, "Name"),
        &String::from_str(&env, "Origin"),
        &owner,
        &1,
    );
}

#[test]
fn test_name_at_max_length_accepted() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    client.register_product(
        &String::from_str(&env, "prod-name-max"),
        &str_of_len(&env, 256),
        &String::from_str(&env, "Origin"),
        &owner,
        &1,
    );
}

#[test]
#[should_panic(expected = "name exceeds max length")]
fn test_name_over_max_length_rejected() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    client.register_product(
        &String::from_str(&env, "prod-name-over"),
        &str_of_len(&env, 257),
        &String::from_str(&env, "Origin"),
        &owner,
        &1,
    );
}

#[test]
fn test_origin_at_max_length_accepted() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    client.register_product(
        &String::from_str(&env, "prod-origin-max"),
        &String::from_str(&env, "Name"),
        &str_of_len(&env, 256),
        &owner,
        &1,
    );
}

#[test]
#[should_panic(expected = "origin exceeds max length")]
fn test_origin_over_max_length_rejected() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    client.register_product(
        &String::from_str(&env, "prod-origin-over"),
        &String::from_str(&env, "Name"),
        &str_of_len(&env, 257),
        &owner,
        &1,
    );
}

#[test]
fn test_location_at_max_length_accepted() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let pid = String::from_str(&env, "prod-loc-max");
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &1);
    client.add_tracking_event(
        &pid,
        &owner,
        &str_of_len(&env, 256),
        &String::from_str(&env, "HARVEST"),
        &String::from_str(&env, "{}"),
    );
    assert_eq!(client.get_events_count(&pid), 1);
}

#[test]
#[should_panic(expected = "location exceeds max length")]
fn test_location_over_max_length_rejected() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let pid = String::from_str(&env, "prod-loc-over");
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &1);
    client.add_tracking_event(
        &pid,
        &owner,
        &str_of_len(&env, 257),
        &String::from_str(&env, "HARVEST"),
        &String::from_str(&env, "{}"),
    );
}

#[test]
fn test_metadata_at_max_length_accepted() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let pid = String::from_str(&env, "prod-meta-max");
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &1);
    client.add_tracking_event(
        &pid,
        &owner,
        &String::from_str(&env, "Loc"),
        &String::from_str(&env, "HARVEST"),
        &str_of_len(&env, 4096),
    );
    assert_eq!(client.get_events_count(&pid), 1);
}

#[test]
#[should_panic(expected = "metadata exceeds max length")]
fn test_metadata_over_max_length_rejected() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let pid = String::from_str(&env, "prod-meta-over");
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &1);
    client.add_tracking_event(
        &pid,
        &owner,
        &String::from_str(&env, "Loc"),
        &String::from_str(&env, "HARVEST"),
        &str_of_len(&env, 4097),
    );
}

// ── 2. Unauthorized access attempts ──────────────────────────────────────────

#[test]
fn test_unauthorized_add_tracking_event_rejected() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let stranger = Address::generate(&env);
    let pid = String::from_str(&env, "prod-unauth");
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &1);
    let result = client.try_add_tracking_event(
        &pid,
        &stranger,
        &String::from_str(&env, "Loc"),
        &String::from_str(&env, "HARVEST"),
        &String::from_str(&env, "{}"),
    );
    assert!(result.is_err());
}

#[test]
fn test_unauthorized_reject_event_rejected() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let actor = Address::generate(&env);
    let stranger = Address::generate(&env);
    let pid = String::from_str(&env, "prod-rej-unauth");
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &2);
    client.add_authorized_actor(&pid, &actor, &0);
    client.add_tracking_event(
        &pid, &actor,
        &String::from_str(&env, "Loc"),
        &String::from_str(&env, "HARVEST"),
        &String::from_str(&env, "{}"),
    );
    let result = client.try_reject_event(
        &pid, &0, &stranger, &String::from_str(&env, ""),
    );
    assert!(result.is_err());
}

// ── 3. Duplicate product registration ────────────────────────────────────────

#[test]
#[should_panic(expected = "product already exists")]
fn test_duplicate_product_registration_rejected() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let pid = String::from_str(&env, "prod-dup");
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &1);
    client.register_product(&pid, &String::from_str(&env, "N2"), &String::from_str(&env, "O2"), &owner, &1);
}

// ── 4. Nonexistent product queries return safe defaults ───────────────────────

#[test]
fn test_get_product_nonexistent_returns_error() {
    let (env, client) = setup();
    let result = client.try_get_product(&String::from_str(&env, "ghost"));
    assert!(result.is_err());
}

#[test]
fn test_get_tracking_events_nonexistent_returns_empty() {
    let (env, client) = setup();
    let events = client.get_tracking_events(&String::from_str(&env, "ghost"));
    assert_eq!(events.len(), 0);
}

#[test]
fn test_get_events_count_nonexistent_returns_zero() {
    let (env, client) = setup();
    assert_eq!(client.get_events_count(&String::from_str(&env, "ghost")), 0);
}

#[test]
fn test_get_pending_events_nonexistent_returns_empty() {
    let (env, client) = setup();
    let pending = client.get_pending_events(&String::from_str(&env, "ghost"));
    assert_eq!(pending.len(), 0);
}

#[test]
fn test_get_authorized_actors_nonexistent_returns_empty() {
    let (env, client) = setup();
    let actors = client.get_authorized_actors(&String::from_str(&env, "ghost"));
    assert_eq!(actors.len(), 0);
}

#[test]
fn test_product_exists_nonexistent_returns_false() {
    let (env, client) = setup();
    assert!(!client.product_exists(&String::from_str(&env, "ghost")));
}

// ── 5. Nonce replay protection ────────────────────────────────────────────────

#[test]
#[should_panic(expected = "invalid nonce")]
fn test_replay_of_consumed_nonce_rejected() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let actor = Address::generate(&env);
    let pid = String::from_str(&env, "prod-nonce-replay");
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &1);
    // nonce 0 consumed
    client.add_authorized_actor(&pid, &actor, &0);
    // replaying nonce 0 must fail
    client.add_authorized_actor(&pid, &actor, &0);
}

#[test]
#[should_panic(expected = "invalid nonce")]
fn test_future_nonce_rejected() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let pid = String::from_str(&env, "prod-nonce-future");
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &1);
    // expected nonce is 0, providing 5
    client.transfer_ownership(&pid, &new_owner, &5);
}

// ── 6. Multi-sig quorum edge cases ────────────────────────────────────────────

#[test]
fn test_single_approval_does_not_finalize_event() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let actor = Address::generate(&env);
    let pid = String::from_str(&env, "prod-multisig-pending");
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &2);
    client.add_authorized_actor(&pid, &actor, &0);
    client.add_tracking_event(&pid, &actor, &String::from_str(&env, "Loc"), &String::from_str(&env, "HARVEST"), &String::from_str(&env, "{}"));

    // one approval — event must stay pending
    let finalized = client.approve_event(&pid, &0, &owner, &1);
    assert!(!finalized);
    assert_eq!(client.get_events_count(&pid), 0);
    assert_eq!(client.get_pending_events(&pid).len(), 1);
}

#[test]
fn test_second_approval_finalizes_event() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let actor = Address::generate(&env);
    let pid = String::from_str(&env, "prod-multisig-final");
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &2);
    client.add_authorized_actor(&pid, &actor, &0);
    client.add_tracking_event(&pid, &actor, &String::from_str(&env, "Loc"), &String::from_str(&env, "HARVEST"), &String::from_str(&env, "{}"));

    client.approve_event(&pid, &0, &owner, &1);
    let finalized = client.approve_event(&pid, &0, &actor, &0);
    assert!(finalized);
    assert_eq!(client.get_events_count(&pid), 1);
    assert_eq!(client.get_pending_events(&pid).len(), 0);
}

#[test]
fn test_duplicate_approval_does_not_double_count() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let actor = Address::generate(&env);
    let pid = String::from_str(&env, "prod-multisig-dedup");
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &3);
    client.add_authorized_actor(&pid, &actor, &0);
    client.add_tracking_event(&pid, &actor, &String::from_str(&env, "Loc"), &String::from_str(&env, "HARVEST"), &String::from_str(&env, "{}"));

    // owner approves twice — should not count twice
    client.approve_event(&pid, &0, &owner, &1);
    let still_pending = client.approve_event(&pid, &0, &owner, &2);
    assert!(!still_pending);
    // still need actor approval
    assert_eq!(client.get_events_count(&pid), 0);
}

#[test]
fn test_reject_before_quorum_clears_pending_queue() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let actor = Address::generate(&env);
    let pid = String::from_str(&env, "prod-reject-clear");
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &2);
    client.add_authorized_actor(&pid, &actor, &0);
    client.add_tracking_event(&pid, &actor, &String::from_str(&env, "Loc"), &String::from_str(&env, "HARVEST"), &String::from_str(&env, "{}"));

    assert_eq!(client.get_pending_events(&pid).len(), 1);
    client.reject_event(&pid, &0, &owner, &String::from_str(&env, "bad data"), &1);
    assert_eq!(client.get_pending_events(&pid).len(), 0);
    assert_eq!(client.get_events_count(&pid), 0);
}

// ── 7. Governance safeguard ───────────────────────────────────────────────────

#[test]
#[should_panic(expected = "removal would violate governance")]
fn test_remove_actor_below_required_signatures_rejected() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let actor = Address::generate(&env);
    let pid = String::from_str(&env, "prod-gov-guard");
    // required_signatures = 2 means at least owner + 1 actor needed
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &2);
    client.add_authorized_actor(&pid, &actor, &0);
    // removing the only actor would drop total authorised to 1 < required 2
    client.remove_authorized_actor(&pid, &actor, &1);
}

// ── 8. Full lifecycle compound workflow ───────────────────────────────────────

#[test]
fn test_full_lifecycle_compound_workflow() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let actor = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let pid = String::from_str(&env, "prod-lifecycle");

    // Register
    client.register_product(&pid, &String::from_str(&env, "Coffee"), &String::from_str(&env, "Ethiopia"), &owner, &2);
    assert!(client.product_exists(&pid));
    assert_eq!(client.get_product_count(), 1);

    // Add actor (nonce 0 → 1)
    client.add_authorized_actor(&pid, &actor, &0);
    assert_eq!(client.get_nonce(&owner), 1);
    assert_eq!(client.get_authorized_actors(&pid).len(), 1);

    // Actor submits event (stages as pending)
    client.add_tracking_event(&pid, &actor, &String::from_str(&env, "Port of Hamburg"), &String::from_str(&env, "SHIPPING"), &String::from_str(&env, "{\"temp\":\"4C\"}"));
    assert_eq!(client.get_pending_events(&pid).len(), 1);
    assert_eq!(client.get_events_count(&pid), 0);

    // Owner gives first approval (nonce 1 → 2), event not yet finalized
    let not_done = client.approve_event(&pid, &0, &owner, &1);
    assert!(!not_done);

    // Actor gives second approval (nonce 0 → 1 for actor), event finalized
    let done = client.approve_event(&pid, &0, &actor, &0);
    assert!(done);
    assert_eq!(client.get_events_count(&pid), 1);
    assert_eq!(client.get_pending_events(&pid).len(), 0);

    // Transfer ownership (owner nonce 2 → 3)
    client.transfer_ownership(&pid, &new_owner, &2);
    assert_eq!(client.get_nonce(&owner), 3);

    // Verify new owner stored
    let product = client.get_product(&pid).unwrap();
    assert_eq!(product.owner, new_owner);
}

// ── 9. Event count increments correctly across multiple events ────────────────

#[test]
fn test_event_count_increments_per_event() {
    let (env, client) = setup();
    let owner = Address::generate(&env);
    let pid = String::from_str(&env, "prod-count");
    client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &1);

    for i in 0u32..5 {
        client.add_tracking_event(&pid, &owner, &String::from_str(&env, "Loc"), &String::from_str(&env, "RETAIL"), &String::from_str(&env, "{}"));
        assert_eq!(client.get_events_count(&pid), i + 1);
    }
}

// ── 10. Pagination returns correct slice ──────────────────────────────────────

#[test]
fn test_list_products_pagination() {
    let (env, client) = setup();
    let owner = Address::generate(&env);

    for i in 0u32..5 {
        let pid = String::from_str(&env, &format!("prod-page-{}", i));
        client.register_product(&pid, &String::from_str(&env, "N"), &String::from_str(&env, "O"), &owner, &1);
    }

    assert_eq!(client.get_product_count(), 5);
    // first page of 3
    assert_eq!(client.list_products(&0, &3).len(), 3);
    // second page
    assert_eq!(client.list_products(&3, &3).len(), 2);
    // out-of-range offset
    assert_eq!(client.list_products(&10, &3).len(), 0);
}
