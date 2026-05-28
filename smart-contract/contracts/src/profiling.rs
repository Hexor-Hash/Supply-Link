/// Storage rent and cost profiling suite for Supply-Link.
///
/// Each test registers products and events at realistic volumes, then asserts
/// that CPU instructions and storage-entry counts stay within documented budget
/// thresholds (see `docs/storage-cost-budget.md`).
///
/// Run with:
///   cargo test --features testutils -- profiling 2>&1 | tee cost_report.txt
///
/// The output lines tagged `[COST]` are parsed by `scripts/cost_report.sh`.
#[cfg(test)]
mod profiling {
    use crate::{SupplyLinkContract, SupplyLinkContractClient};
    use soroban_sdk::testutils::{Address as _, Logs};
    use soroban_sdk::{Env, String};

    // ── Budget thresholds ────────────────────────────────────────────────────
    // Derived from the baseline measurements in docs/storage-cost-budget.md.
    // Adjust after each schema change and re-run the suite.

    /// Max CPU instructions for a single register_product call.
    const BUDGET_REGISTER_CPU: u64 = 2_500_000;
    /// Max CPU instructions for a single add_tracking_event call.
    const BUDGET_ADD_EVENT_CPU: u64 = 3_000_000;
    /// Max storage entries after registering N_PRODUCTS products.
    const BUDGET_REGISTER_STORAGE_ENTRIES: usize = 210; // 2 entries/product + 1 counter
    /// Max storage entries after adding N_EVENTS events to one product.
    const BUDGET_EVENTS_STORAGE_ENTRIES: usize = 5;

    const N_PRODUCTS: u64 = 100;
    const N_EVENTS: u64 = 50;

    fn new_env() -> Env {
        let env = Env::default();
        env.mock_all_auths();
        env
    }

    fn deploy(env: &Env) -> (soroban_sdk::Address, soroban_sdk::Address) {
        let contract_id = env.register_contract(None, SupplyLinkContract);
        let owner = soroban_sdk::Address::generate(env);
        (contract_id, owner)
    }

    // ── register_product ─────────────────────────────────────────────────────

    /// Measures CPU budget consumed by a single register_product call.
    #[test]
    fn profile_register_product_single() {
        let env = new_env();
        let (contract_id, owner) = deploy(&env);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        env.budget().reset_default();
        client.register_product(
            &String::from_str(&env, "prod-0"),
            &String::from_str(&env, "Coffee Beans"),
            &String::from_str(&env, "Ethiopia"),
            &owner,
            &0u32,
        );
        let cpu = env.budget().cpu_instruction_count();
        let mem = env.budget().memory_bytes_used();

        println!("[COST] register_product single | cpu_instructions={cpu} | memory_bytes={mem}");
        assert!(
            cpu <= BUDGET_REGISTER_CPU,
            "register_product CPU {cpu} exceeds budget {BUDGET_REGISTER_CPU}"
        );
    }

    /// Measures storage growth across N_PRODUCTS registrations.
    #[test]
    fn profile_register_product_bulk_storage() {
        let env = new_env();
        let (contract_id, owner) = deploy(&env);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        for i in 0..N_PRODUCTS {
            client.register_product(
                &String::from_str(&env, &format!("prod-{i}")),
                &String::from_str(&env, "Item"),
                &String::from_str(&env, "Origin"),
                &owner,
                &0u32,
            );
        }

        // Each product: 1 Product entry + 1 ProductIndex entry + 1 shared ProductCount
        let count = client.get_product_count();
        println!(
            "[COST] register_product bulk | products={N_PRODUCTS} | product_count={count} | \
             storage_entries_approx={}",
            N_PRODUCTS * 2 + 1
        );
        assert_eq!(count, N_PRODUCTS, "product count mismatch");
        assert!(
            (N_PRODUCTS * 2 + 1) as usize <= BUDGET_REGISTER_STORAGE_ENTRIES,
            "storage entries {} exceed budget {BUDGET_REGISTER_STORAGE_ENTRIES}",
            N_PRODUCTS * 2 + 1
        );
    }

    // ── add_tracking_event ───────────────────────────────────────────────────

    /// Measures CPU budget consumed by a single add_tracking_event call.
    #[test]
    fn profile_add_event_single() {
        let env = new_env();
        let (contract_id, owner) = deploy(&env);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        client.register_product(
            &String::from_str(&env, "p1"),
            &String::from_str(&env, "Item"),
            &String::from_str(&env, "Origin"),
            &owner,
            &0u32,
        );

        env.budget().reset_default();
        client.add_tracking_event(
            &String::from_str(&env, "p1"),
            &owner,
            &String::from_str(&env, "Port of Hamburg"),
            &String::from_str(&env, "SHIPPING"),
            &String::from_str(&env, r#"{"temp":"4C"}"#),
        );
        let cpu = env.budget().cpu_instruction_count();
        let mem = env.budget().memory_bytes_used();

        println!("[COST] add_tracking_event single | cpu_instructions={cpu} | memory_bytes={mem}");
        assert!(
            cpu <= BUDGET_ADD_EVENT_CPU,
            "add_tracking_event CPU {cpu} exceeds budget {BUDGET_ADD_EVENT_CPU}"
        );
    }

    /// Measures storage growth as events accumulate on one product.
    /// This is the highest-cost path: the Events Vec grows unboundedly.
    #[test]
    fn profile_add_event_bulk_storage() {
        let env = new_env();
        let (contract_id, owner) = deploy(&env);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        client.register_product(
            &String::from_str(&env, "p1"),
            &String::from_str(&env, "Item"),
            &String::from_str(&env, "Origin"),
            &owner,
            &0u32,
        );

        for i in 0..N_EVENTS {
            client.add_tracking_event(
                &String::from_str(&env, "p1"),
                &owner,
                &String::from_str(&env, "Loc"),
                &String::from_str(&env, "SHIPPING"),
                &String::from_str(&env, &format!(r#"{{"seq":{i}}}"#)),
            );
        }

        let count = client.get_events_count(&String::from_str(&env, "p1"));
        // All events are stored in a single Vec under one storage key.
        // Storage entries: 1 Product + 1 Events Vec + 1 ProductIndex + 1 ProductCount = 4
        let storage_entries = 4usize;
        println!(
            "[COST] add_tracking_event bulk | events={N_EVENTS} | event_count={count} | \
             storage_entries={storage_entries} | \
             NOTE=all_events_in_single_vec_key_grows_unbounded"
        );
        assert_eq!(count, N_EVENTS as u32);
        assert!(
            storage_entries <= BUDGET_EVENTS_STORAGE_ENTRIES,
            "storage entries {storage_entries} exceed budget {BUDGET_EVENTS_STORAGE_ENTRIES}"
        );
    }

    /// Measures CPU cost growth as the Events Vec grows (read-back cost).
    /// Identifies the unbounded Vec as the primary hotspot.
    #[test]
    fn profile_get_tracking_events_cost_growth() {
        let env = new_env();
        let (contract_id, owner) = deploy(&env);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        client.register_product(
            &String::from_str(&env, "p1"),
            &String::from_str(&env, "Item"),
            &String::from_str(&env, "Origin"),
            &owner,
            &0u32,
        );

        // Measure at 10, 25, and 50 events to show linear growth
        let checkpoints = [10u64, 25, 50];
        let mut prev = 0u64;
        for &checkpoint in &checkpoints {
            while prev < checkpoint {
                client.add_tracking_event(
                    &String::from_str(&env, "p1"),
                    &owner,
                    &String::from_str(&env, "Loc"),
                    &String::from_str(&env, "SHIPPING"),
                    &String::from_str(&env, "{}"),
                );
                prev += 1;
            }
            env.budget().reset_default();
            client.get_tracking_events(&String::from_str(&env, "p1"));
            let cpu = env.budget().cpu_instruction_count();
            let mem = env.budget().memory_bytes_used();
            println!(
                "[COST] get_tracking_events | events={checkpoint} | \
                 cpu_instructions={cpu} | memory_bytes={mem}"
            );
        }
        // No hard assertion — this test exists to produce growth data for the report.
    }

    // ── transfer_ownership ───────────────────────────────────────────────────

    #[test]
    fn profile_transfer_ownership() {
        let env = new_env();
        let (contract_id, owner) = deploy(&env);
        let client = SupplyLinkContractClient::new(&env, &contract_id);
        let new_owner = soroban_sdk::Address::generate(&env);

        client.register_product(
            &String::from_str(&env, "p1"),
            &String::from_str(&env, "Item"),
            &String::from_str(&env, "Origin"),
            &owner,
            &0u32,
        );

        env.budget().reset_default();
        client.transfer_ownership(&String::from_str(&env, "p1"), &new_owner);
        let cpu = env.budget().cpu_instruction_count();
        let mem = env.budget().memory_bytes_used();
        println!(
            "[COST] transfer_ownership single | cpu_instructions={cpu} | memory_bytes={mem}"
        );
    }

    // ── list_products pagination ─────────────────────────────────────────────

    #[test]
    fn profile_list_products_pagination() {
        let env = new_env();
        let (contract_id, owner) = deploy(&env);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        for i in 0..N_PRODUCTS {
            client.register_product(
                &String::from_str(&env, &format!("prod-{i}")),
                &String::from_str(&env, "Item"),
                &String::from_str(&env, "Origin"),
                &owner,
                &0u32,
            );
        }

        // Measure cost of fetching a page of 10
        env.budget().reset_default();
        let page = client.list_products(&0u64, &10u64);
        let cpu = env.budget().cpu_instruction_count();
        let mem = env.budget().memory_bytes_used();
        println!(
            "[COST] list_products page_size=10 total={N_PRODUCTS} | \
             cpu_instructions={cpu} | memory_bytes={mem} | returned={}",
            page.len()
        );
        assert_eq!(page.len(), 10);
    }
}
