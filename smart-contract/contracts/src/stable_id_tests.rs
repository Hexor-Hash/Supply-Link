// New test file: smart-contract/contracts/src/stable_id_tests.rs
// These tests demonstrate the stable pending event ID semantics

#[cfg(test)]
mod stable_id_tests {
    use crate::*;
    use soroban_sdk::{testutils::Address as _, Env, String};

    /// Test that pending events have stable immutable IDs
    #[test]
    fn test_pending_events_have_stable_ids() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let actor = Address::generate(&env);
        let product_id = String::from_str(&env, "p1");

        // Register product with multi-sig requirement
        client.register_product(
            &product_id,
            &String::from_str(&env, "Product1"),
            &String::from_str(&env, "Origin"),
            &owner,
            &3, // require 3 signatures
        );

        client.add_authorized_actor(&product_id, &actor);

        // Add 3 events - they should get stable IDs 0, 1, 2
        for i in 0..3 {
            client.add_tracking_event(
                &product_id,
                &owner,
                &String::from_str(&env, "Location"),
                &String::from_str(&env, "HARVEST"),
                &String::from_str(&env, "{}"),
            );
        }

        // Get pending events and verify stable IDs
        let pending = client.get_pending_events(&product_id);
        assert_eq!(pending.len(), 3);

        // Verify IDs are sequential
        assert_eq!(pending.get(0).unwrap().pending_event_id, 0);
        assert_eq!(pending.get(1).unwrap().pending_event_id, 1);
        assert_eq!(pending.get(2).unwrap().pending_event_id, 2);
    }

    /// Test that stable IDs survive queue mutations (rejections)
    #[test]
    fn test_stable_ids_survive_queue_mutation() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let product_id = String::from_str(&env, "p1");

        client.register_product(
            &product_id,
            &String::from_str(&env, "Product1"),
            &String::from_str(&env, "Origin"),
            &owner,
            &2,
        );

        // Add 3 events with IDs: 0, 1, 2
        for _ in 0..3 {
            client.add_tracking_event(
                &product_id,
                &owner,
                &String::from_str(&env, "L"),
                &String::from_str(&env, "HARVEST"),
                &String::from_str(&env, "{}"),
            );
        }

        let pending = client.get_pending_events(&product_id);
        assert_eq!(pending.len(), 3);
        assert_eq!(pending.get(0).unwrap().pending_event_id, 0);
        assert_eq!(pending.get(1).unwrap().pending_event_id, 1);
        assert_eq!(pending.get(2).unwrap().pending_event_id, 2);

        // Reject the first event (ID=0)
        // Queue shifts: [ID=1, ID=2]
        client.reject_event(
            &product_id,
            0, // pending_event_id
            &owner,
            &String::from_str(&env, "Not needed"),
        );

        let pending = client.get_pending_events(&product_id);
        assert_eq!(pending.len(), 2);

        // Verify IDs are preserved after rejection
        assert_eq!(pending.get(0).unwrap().pending_event_id, 1);
        assert_eq!(pending.get(1).unwrap().pending_event_id, 2);
    }

    /// Test that approve uses stable ID, NOT index
    #[test]
    fn test_approve_targets_by_stable_id_not_index() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let actor = Address::generate(&env);
        let product_id = String::from_str(&env, "p1");

        client.register_product(
            &product_id,
            &String::from_str(&env, "Product1"),
            &String::from_str(&env, "Origin"),
            &owner,
            &2, // require 2 signatures
        );

        client.add_authorized_actor(&product_id, &actor);

        // Add 3 events: IDs 0, 1, 2
        for _ in 0..3 {
            client.add_tracking_event(
                &product_id,
                &owner,
                &String::from_str(&env, "L"),
                &String::from_str(&env, "HARVEST"),
                &String::from_str(&env, "{}"),
            );
        }

        // Reject event at ID=0 → queue becomes [ID=1, ID=2]
        client.reject_event(
            &product_id,
            0,
            &owner,
            &String::from_str(&env, ""),
        );

        // Now: Queue is [ID=1 at index 0, ID=2 at index 1]
        // If we had index-based targeting, approvers would get confused
        // Approve by ID=2 (now at index 1 in the queue)
        let finalized = client.approve_event(
            &product_id,
            2,      // Approve by stable ID (was originally at index 2)
            &owner,
        );

        // Should finalize because owner is the second approver
        assert_eq!(finalized, true);

        // Verify event ID=2 was the finalized one by checking remaining pending
        let remaining = client.get_pending_events(&product_id);
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining.get(0).unwrap().pending_event_id, 1);
    }

    /// Test reject by stable ID after earlier rejection
    #[test]
    fn test_reject_targets_by_stable_id_not_index() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let product_id = String::from_str(&env, "p1");

        client.register_product(
            &product_id,
            &String::from_str(&env, "Product1"),
            &String::from_str(&env, "Origin"),
            &owner,
            &3,
        );

        // Add 3 events: IDs 0, 1, 2
        for _ in 0..3 {
            client.add_tracking_event(
                &product_id,
                &owner,
                &String::from_str(&env, "L"),
                &String::from_str(&env, "HARVEST"),
                &String::from_str(&env, "{}"),
            );
        }

        // Reject ID=0
        client.reject_event(
            &product_id,
            0,
            &owner,
            &String::from_str(&env, ""),
        );

        // Queue: [ID=1 at index 0, ID=2 at index 1]
        // Reject ID=2 (which is now at index 1)
        client.reject_event(
            &product_id,
            2,  // Stable ID (was originally at index 2)
            &owner,
            &String::from_str(&env, ""),
        );

        // Verify only ID=1 remains
        let remaining = client.get_pending_events(&product_id);
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining.get(0).unwrap().pending_event_id, 1);
    }

    /// Test that get_pending_event_id_at_index aids migration
    #[test]
    fn test_migration_helper_get_pending_event_id_at_index() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let product_id = String::from_str(&env, "p1");

        client.register_product(
            &product_id,
            &String::from_str(&env, "Product1"),
            &String::from_str(&env, "Origin"),
            &owner,
            &2,
        );

        // Add 3 events
        for _ in 0..3 {
            client.add_tracking_event(
                &product_id,
                &owner,
                &String::from_str(&env, "L"),
                &String::from_str(&env, "HARVEST"),
                &String::from_str(&env, "{}"),
            );
        }

        // Bridge function returns stable ID for given index
        let id_at_index_0 = client.get_pending_event_id_at_index(&product_id, &0);
        let id_at_index_1 = client.get_pending_event_id_at_index(&product_id, &1);
        let id_at_index_2 = client.get_pending_event_id_at_index(&product_id, &2);

        assert_eq!(id_at_index_0, 0);
        assert_eq!(id_at_index_1, 1);
        assert_eq!(id_at_index_2, 2);

        // After rejection
        client.reject_event(
            &product_id,
            0,
            &owner,
            &String::from_str(&env, ""),
        );

        // Bridge still works: indices map to new IDs
        let id_at_index_0_after = client.get_pending_event_id_at_index(&product_id, &0);
        let id_at_index_1_after = client.get_pending_event_id_at_index(&product_id, &1);

        assert_eq!(id_at_index_0_after, 1);
        assert_eq!(id_at_index_1_after, 2);
    }

    /// Test concurrent-like sequences: deterministic queue semantics
    #[test]
    fn test_deterministic_queue_semantics_after_mutations() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let product_id = String::from_str(&env, "p1");

        client.register_product(
            &product_id,
            &String::from_str(&env, "Product1"),
            &String::from_str(&env, "Origin"),
            &owner,
            &2,
        );

        // Sequence: add → reject → add → approve
        // Expected: stable IDs ensure determinism

        client.add_tracking_event(
            &product_id,
            &owner,
            &String::from_str(&env, "L"),
            &String::from_str(&env, "HARVEST"),
            &String::from_str(&env, "{}"),
        ); // ID=0

        client.add_tracking_event(
            &product_id,
            &owner,
            &String::from_str(&env, "L"),
            &String::from_str(&env, "HARVEST"),
            &String::from_str(&env, "{}"),
        ); // ID=1

        // Reject ID=0
        client.reject_event(
            &product_id,
            0,
            &owner,
            &String::from_str(&env, ""),
        );

        // Add new event
        client.add_tracking_event(
            &product_id,
            &owner,
            &String::from_str(&env, "L"),
            &String::from_str(&env, "HARVEST"),
            &String::from_str(&env, "{}"),
        ); // ID=2

        let pending = client.get_pending_events(&product_id);
        assert_eq!(pending.len(), 2);
        assert_eq!(pending.get(0).unwrap().pending_event_id, 1);
        assert_eq!(pending.get(1).unwrap().pending_event_id, 2);

        // Approve ID=2 (at index 1 after rejecting ID=0)
        client.approve_event(
            &product_id,
            2,
            &owner,
        );

        // Verify ID=2 was finalized
        let finalized = client.get_tracking_events(&product_id);
        assert_eq!(finalized.len(), 1);

        // Verify only ID=1 remains pending
        let remaining_pending = client.get_pending_events(&product_id);
        assert_eq!(remaining_pending.len(), 1);
        assert_eq!(remaining_pending.get(0).unwrap().pending_event_id, 1);
    }
}
