#[cfg(test)]
mod tests {
    use crate::{Batch, Product, SupplyLinkContract, SupplyLinkContractClient};
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    // ── Helpers ───────────────────────────────────────────────────────────────

    fn setup() -> (Env, Address, Address, String) {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, SupplyLinkContract);
        let owner = Address::generate(&env);
        let pid = String::from_str(&env, "prod-001");
        let client = SupplyLinkContractClient::new(&env, &cid);
        client.register_product(
            &pid,
            &String::from_str(&env, "Widget"),
            &String::from_str(&env, "Factory A"),
            &owner,
        );
        (env, cid, owner, pid)
    }

    fn add_event(env: &Env, cid: &Address, pid: &String, caller: &Address) {
        SupplyLinkContractClient::new(env, cid).add_tracking_event(
            pid,
            caller,
            &String::from_str(env, "Warehouse"),
            &String::from_str(env, "SHIPPING"),
            &String::from_str(env, "{}"),
        );
    }

    // ── #406: Expiration & spoilage ───────────────────────────────────────────

    #[test]
    fn test_update_expiration_and_is_expired() {
        let (env, cid, _owner, pid) = setup();
        let client = SupplyLinkContractClient::new(&env, &cid);

        // No expiration set → not expired
        assert!(!client.is_expired(&pid));

        // Set expiration in the past (timestamp 1 = definitely past)
        client.update_expiration(&pid, &1u64);
        assert!(client.is_expired(&pid));

        // Clear expiration
        client.update_expiration(&pid, &0u64);
        assert!(!client.is_expired(&pid));
    }

    #[test]
    fn test_mark_spoiled_records_event() {
        let (env, cid, _owner, pid) = setup();
        let client = SupplyLinkContractClient::new(&env, &cid);

        let result = client.mark_spoiled(&pid, &String::from_str(&env, "contamination"));
        assert!(result);

        let product = client.get_product(&pid);
        assert!(product.spoiled);

        // SPOILED event should be in the event log
        let events = client.get_tracking_events(&pid);
        assert_eq!(events.len(), 1);
        assert_eq!(events.get(0).unwrap().event_type, String::from_str(&env, "SPOILED"));
    }

    #[test]
    fn test_mark_spoiled_is_idempotent() {
        let (env, cid, _owner, pid) = setup();
        let client = SupplyLinkContractClient::new(&env, &cid);
        client.mark_spoiled(&pid, &String::from_str(&env, "reason"));
        client.mark_spoiled(&pid, &String::from_str(&env, "reason"));
        // Only one SPOILED event
        assert_eq!(client.get_tracking_events(&pid).len(), 1);
    }

    #[test]
    #[should_panic(expected = "spoiled product cannot be transferred")]
    fn test_spoiled_product_cannot_be_transferred() {
        let (env, cid, owner, pid) = setup();
        let client = SupplyLinkContractClient::new(&env, &cid);
        client.mark_spoiled(&pid, &String::from_str(&env, "bad"));
        let new_owner = Address::generate(&env);
        env.as_contract(&cid, || {
            SupplyLinkContract::transfer_ownership(env.clone(), pid.clone(), new_owner.clone());
        });
    }

    #[test]
    #[should_panic(expected = "product is spoiled")]
    fn test_spoiled_product_rejects_events() {
        let (env, cid, owner, pid) = setup();
        let client = SupplyLinkContractClient::new(&env, &cid);
        client.mark_spoiled(&pid, &String::from_str(&env, "bad"));
        env.as_contract(&cid, || {
            SupplyLinkContract::add_tracking_event(
                env.clone(),
                pid.clone(),
                owner.clone(),
                String::from_str(&env, "Loc"),
                String::from_str(&env, "SHIPPING"),
                String::from_str(&env, "{}"),
            );
        });
    }

    // ── #408: Key rotation ────────────────────────────────────────────────────

    #[test]
    fn test_rotate_owner_key_success() {
        let (env, cid, owner, pid) = setup();
        let client = SupplyLinkContractClient::new(&env, &cid);
        let new_owner = Address::generate(&env);

        let result = client.rotate_owner_key(&pid, &owner, &new_owner);
        assert!(result);

        let product = client.get_product(&pid);
        assert_eq!(product.owner, new_owner);
    }

    #[test]
    fn test_rotated_owner_can_perform_owner_actions() {
        let (env, cid, owner, pid) = setup();
        let client = SupplyLinkContractClient::new(&env, &cid);
        let new_owner = Address::generate(&env);
        let actor = Address::generate(&env);

        client.rotate_owner_key(&pid, &owner, &new_owner);
        // New owner should be able to add an authorized actor
        let result = client.add_authorized_actor(&pid, &actor);
        assert!(result);
    }

    #[test]
    #[should_panic(expected = "old_owner does not match current owner")]
    fn test_rotate_owner_key_wrong_old_owner_panics() {
        let (env, cid, _owner, pid) = setup();
        let client = SupplyLinkContractClient::new(&env, &cid);
        let wrong = Address::generate(&env);
        let new_owner = Address::generate(&env);
        env.as_contract(&cid, || {
            SupplyLinkContract::rotate_owner_key(env.clone(), pid.clone(), wrong.clone(), new_owner.clone());
        });
    }

    #[test]
    fn test_rotate_authorized_actor_key_success() {
        let (env, cid, _owner, pid) = setup();
        let client = SupplyLinkContractClient::new(&env, &cid);
        let old_actor = Address::generate(&env);
        let new_actor = Address::generate(&env);

        client.add_authorized_actor(&pid, &old_actor);
        let result = client.rotate_authorized_actor_key(&pid, &old_actor, &new_actor);
        assert!(result);

        // new_actor should be in authorized_actors, old_actor should not
        let product = client.get_product(&pid);
        assert!(product.authorized_actors.contains(&new_actor));
        assert!(!product.authorized_actors.contains(&old_actor));
    }

    #[test]
    fn test_rotated_actor_can_add_events() {
        let (env, cid, _owner, pid) = setup();
        let client = SupplyLinkContractClient::new(&env, &cid);
        let old_actor = Address::generate(&env);
        let new_actor = Address::generate(&env);

        client.add_authorized_actor(&pid, &old_actor);
        client.rotate_authorized_actor_key(&pid, &old_actor, &new_actor);
        add_event(&env, &cid, &pid, &new_actor);
        assert_eq!(client.get_tracking_events(&pid).len(), 1);
    }

    #[test]
    #[should_panic(expected = "old_actor is not an authorized actor")]
    fn test_rotate_actor_key_not_authorized_panics() {
        let (env, cid, _owner, pid) = setup();
        let old_actor = Address::generate(&env);
        let new_actor = Address::generate(&env);
        env.as_contract(&cid, || {
            SupplyLinkContract::rotate_authorized_actor_key(
                env.clone(), pid.clone(), old_actor.clone(), new_actor.clone(),
            );
        });
    }

    // ── #405: Batch / lot tracking ────────────────────────────────────────────

    #[test]
    fn test_create_batch() {
        let env = Env::default();
        env.mock_all_auths();
        let cid = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &cid);
        let owner = Address::generate(&env);
        let bid = String::from_str(&env, "batch-001");

        let batch = client.create_batch(&bid, &String::from_str(&env, "Lot A"), &owner);
        assert_eq!(batch.id, bid);
        assert_eq!(batch.product_ids.len(), 0);
    }

    #[test]
    fn test_add_product_to_batch() {
        let (env, cid, owner, pid) = setup();
        let client = SupplyLinkContractClient::new(&env, &cid);
        let bid = String::from_str(&env, "batch-001");

        client.create_batch(&bid, &String::from_str(&env, "Lot A"), &owner);
        client.add_product_to_batch(&bid, &pid);

        let batch = client.get_batch(&bid);
        assert_eq!(batch.product_ids.len(), 1);
        assert_eq!(batch.product_ids.get(0).unwrap(), pid);
    }

    #[test]
    fn test_record_and_get_batch_events() {
        let (env, cid, owner, pid) = setup();
        let client = SupplyLinkContractClient::new(&env, &cid);
        let bid = String::from_str(&env, "batch-001");

        client.create_batch(&bid, &String::from_str(&env, "Lot A"), &owner);
        client.add_product_to_batch(&bid, &pid);

        client.record_batch_event(
            &bid,
            &owner,
            &String::from_str(&env, "Port"),
            &String::from_str(&env, "SHIPPING"),
            &String::from_str(&env, "{\"containers\":10}"),
        );

        let events = client.get_batch_events(&bid);
        assert_eq!(events.len(), 1);
        assert_eq!(events.get(0).unwrap().event_type, String::from_str(&env, "SHIPPING"));

        // Individual product events should NOT include the batch event
        let product_events = client.get_tracking_events(&pid);
        assert_eq!(product_events.len(), 0);
    }

    #[test]
    fn test_batch_events_do_not_pollute_product_events() {
        let (env, cid, owner, pid) = setup();
        let client = SupplyLinkContractClient::new(&env, &cid);
        let bid = String::from_str(&env, "batch-002");

        client.create_batch(&bid, &String::from_str(&env, "Lot B"), &owner);
        client.add_product_to_batch(&bid, &pid);

        // Add one product-level event and one batch-level event
        add_event(&env, &cid, &pid, &owner);
        client.record_batch_event(
            &bid, &owner,
            &String::from_str(&env, "Dock"),
            &String::from_str(&env, "SHIPPING"),
            &String::from_str(&env, "{}"),
        );

        assert_eq!(client.get_tracking_events(&pid).len(), 1);
        assert_eq!(client.get_batch_events(&bid).len(), 1);
    }
#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_nonce_starts_at_zero() {
    let env = Env::default();
    let contract_id = env.register_contract(None, SupplyLinkContract);
    let client = SupplyLinkContractClient::new(&env, &contract_id);
    
    let actor = Address::generate(&env);
    
    assert_eq!(client.get_nonce(&actor), 0);
}

#[test]
fn test_transfer_ownership_increments_nonce() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, SupplyLinkContract);
    let client = SupplyLinkContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    
    client.register_product(
        &String::from_str(&env, "prod1"),
        &String::from_str(&env, "Product 1"),
        &String::from_str(&env, "Origin"),
        &owner,
        &1,
    );
    
    assert_eq!(client.get_nonce(&owner), 0);
    
    client.transfer_ownership(
        &String::from_str(&env, "prod1"),
        &new_owner,
        &0,
    );
    
    assert_eq!(client.get_nonce(&owner), 1);
}

#[test]
#[should_panic(expected = "invalid nonce")]
fn test_transfer_ownership_rejects_stale_nonce() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, SupplyLinkContract);
    let client = SupplyLinkContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let actor = Address::generate(&env);
    
    client.register_product(
        &String::from_str(&env, "prod1"),
        &String::from_str(&env, "Product 1"),
        &String::from_str(&env, "Origin"),
        &owner,
        &1,
    );
    
    client.add_authorized_actor(
        &String::from_str(&env, "prod1"),
        &actor,
        &0,
    );
    
    client.remove_authorized_actor(
        &String::from_str(&env, "prod1"),
        &actor,
        &0,
    );
}

#[test]
#[should_panic(expected = "invalid nonce")]
fn test_transfer_ownership_rejects_future_nonce() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, SupplyLinkContract);
    let client = SupplyLinkContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    
    client.register_product(
        &String::from_str(&env, "prod1"),
        &String::from_str(&env, "Product 1"),
        &String::from_str(&env, "Origin"),
        &owner,
        &1,
    );
    
    client.transfer_ownership(
        &String::from_str(&env, "prod1"),
        &new_owner,
        &5,
    );
}

#[test]
fn test_add_authorized_actor_increments_nonce() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, SupplyLinkContract);
    let client = SupplyLinkContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let actor = Address::generate(&env);
    
    client.register_product(
        &String::from_str(&env, "prod1"),
        &String::from_str(&env, "Product 1"),
        &String::from_str(&env, "Origin"),
        &owner,
        &1,
    );
    
    assert_eq!(client.get_nonce(&owner), 0);
    
    client.add_authorized_actor(
        &String::from_str(&env, "prod1"),
        &actor,
        &0,
    );
    
    assert_eq!(client.get_nonce(&owner), 1);
}

#[test]
#[should_panic(expected = "invalid nonce")]
fn test_add_authorized_actor_rejects_duplicate_nonce() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, SupplyLinkContract);
    let client = SupplyLinkContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let actor1 = Address::generate(&env);
    let actor2 = Address::generate(&env);
    
    client.register_product(
        &String::from_str(&env, "prod1"),
        &String::from_str(&env, "Product 1"),
        &String::from_str(&env, "Origin"),
        &owner,
        &1,
    );
    
    client.add_authorized_actor(
        &String::from_str(&env, "prod1"),
        &actor1,
        &0,
    );
    
    client.add_authorized_actor(
        &String::from_str(&env, "prod1"),
        &actor2,
        &0,
    );
}

#[test]
fn test_remove_authorized_actor_increments_nonce() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, SupplyLinkContract);
    let client = SupplyLinkContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let actor = Address::generate(&env);
    
    client.register_product(
        &String::from_str(&env, "prod1"),
        &String::from_str(&env, "Product 1"),
        &String::from_str(&env, "Origin"),
        &owner,
        &1,
    );
    
    client.add_authorized_actor(
        &String::from_str(&env, "prod1"),
        &actor,
        &0,
    );
    
    assert_eq!(client.get_nonce(&owner), 1);
    
    client.remove_authorized_actor(
        &String::from_str(&env, "prod1"),
        &actor,
        &1,
    );
    
    assert_eq!(client.get_nonce(&owner), 2);
}

#[test]
fn test_approve_event_increments_nonce() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, SupplyLinkContract);
    let client = SupplyLinkContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let actor = Address::generate(&env);
    
    client.register_product(
        &String::from_str(&env, "prod1"),
        &String::from_str(&env, "Product 1"),
        &String::from_str(&env, "Origin"),
        &owner,
        &2,
    );
    
    client.add_tracking_event(
        &String::from_str(&env, "prod1"),
        &owner,
        &String::from_str(&env, "Location"),
        &String::from_str(&env, "HARVEST"),
        &String::from_str(&env, "{}"),
    );
    
    assert_eq!(client.get_nonce(&owner), 0);
    
    client.approve_event(
        &String::from_str(&env, "prod1"),
        &0,
        &owner,
        &0,
    );
    
    assert_eq!(client.get_nonce(&owner), 1);
}

#[test]
#[should_panic(expected = "invalid nonce")]
fn test_approve_event_rejects_out_of_order_nonce() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, SupplyLinkContract);
    let client = SupplyLinkContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    
    client.register_product(
        &String::from_str(&env, "prod1"),
        &String::from_str(&env, "Product 1"),
        &String::from_str(&env, "Origin"),
        &owner,
        &2,
    );
    
    client.add_tracking_event(
        &String::from_str(&env, "prod1"),
        &owner,
        &String::from_str(&env, "Location"),
        &String::from_str(&env, "HARVEST"),
        &String::from_str(&env, "{}"),
    );
    
    client.approve_event(
        &String::from_str(&env, "prod1"),
        &0,
        &owner,
        &1,
    );
}

#[test]
fn test_reject_event_increments_nonce() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, SupplyLinkContract);
    let client = SupplyLinkContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    
    client.register_product(
        &String::from_str(&env, "prod1"),
        &String::from_str(&env, "Product 1"),
        &String::from_str(&env, "Origin"),
        &owner,
        &2,
    );
    
    client.add_tracking_event(
        &String::from_str(&env, "prod1"),
        &owner,
        &String::from_str(&env, "Location"),
        &String::from_str(&env, "HARVEST"),
        &String::from_str(&env, "{}"),
    );
    
    assert_eq!(client.get_nonce(&owner), 0);
    
    client.reject_event(
        &String::from_str(&env, "prod1"),
        &0,
        &owner,
        &String::from_str(&env, ""),
        &0,
    );
    
    assert_eq!(client.get_nonce(&owner), 1);
}

#[test]
fn test_nonce_progression_multiple_operations() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, SupplyLinkContract);
    let client = SupplyLinkContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let actor = Address::generate(&env);
    let new_owner = Address::generate(&env);
    
    client.register_product(
        &String::from_str(&env, "prod1"),
        &String::from_str(&env, "Product 1"),
        &String::from_str(&env, "Origin"),
        &owner,
        &1,
    );
    
    assert_eq!(client.get_nonce(&owner), 0);
    
    client.add_authorized_actor(
        &String::from_str(&env, "prod1"),
        &actor,
        &0,
    );
    assert_eq!(client.get_nonce(&owner), 1);
    
    client.remove_authorized_actor(
        &String::from_str(&env, "prod1"),
        &actor,
        &1,
    );
    assert_eq!(client.get_nonce(&owner), 2);
    
    client.transfer_ownership(
        &String::from_str(&env, "prod1"),
        &new_owner,
        &2,
    );
    assert_eq!(client.get_nonce(&owner), 3);
}

#[test]
fn test_nonce_isolated_per_actor() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, SupplyLinkContract);
    let client = SupplyLinkContractClient::new(&env, &contract_id);
    
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let new_owner = Address::generate(&env);
    
    client.register_product(
        &String::from_str(&env, "prod1"),
        &String::from_str(&env, "Product 1"),
        &String::from_str(&env, "Origin"),
        &owner1,
        &1,
    );
    
    client.register_product(
        &String::from_str(&env, "prod2"),
        &String::from_str(&env, "Product 2"),
        &String::from_str(&env, "Origin"),
        &owner2,
        &1,
    );
    
    client.transfer_ownership(
        &String::from_str(&env, "prod1"),
        &new_owner,
        &0,
    );
    
    assert_eq!(client.get_nonce(&owner1), 1);
    assert_eq!(client.get_nonce(&owner2), 0);
    
    client.transfer_ownership(
        &String::from_str(&env, "prod2"),
        &new_owner,
        &0,
    );
    
    assert_eq!(client.get_nonce(&owner1), 1);
    assert_eq!(client.get_nonce(&owner2), 1);
}
