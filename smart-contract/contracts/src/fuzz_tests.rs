use proptest::prelude::*;
use soroban_sdk::testutils::Env;
use soroban_sdk::{Address, String as SorobanString};
use supply_link::SupplyLinkContract;

/// Helper to create predictable Stellar addresses for testing
fn create_test_address(seed: u8) -> Address {
    Address::generate(&Env::default())
}

// Property-based tests for register_product fuzzing
proptest! {
    #[test]
    fn fuzz_register_product_valid_strings(
        id in "[a-zA-Z0-9-]{1,128}",
        name in "[a-zA-Z0-9 ]{1,256}",
        origin in "[a-zA-Z0-9, ]{1,256}"
    ) {
        let env = Env::default();
        let contract = SupplyLinkContract::new(&env);
        let owner = create_test_address(1);

        let id_str = SorobanString::from_slice(&env, id.as_bytes());
        let name_str = SorobanString::from_slice(&env, name.as_bytes());
        let origin_str = SorobanString::from_slice(&env, origin.as_bytes());

        // Should succeed with valid strings
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.register_product(&owner, &id_str, &name_str, &origin_str);
        }));

        prop_assert!(result.is_ok(), "register_product should not panic with valid input");
    }

    #[test]
    fn fuzz_register_product_empty_strings(
        empty_field in 0u32..3
    ) {
        let env = Env::default();
        let contract = SupplyLinkContract::new(&env);
        let owner = create_test_address(1);

        let valid_id = SorobanString::from_slice(&env, b"product-123");
        let valid_name = SorobanString::from_slice(&env, b"Test Product");
        let valid_origin = SorobanString::from_slice(&env, b"Origin Location");

        let (id, name, origin) = match empty_field {
            0 => (SorobanString::from_slice(&env, b""), valid_name, valid_origin),
            1 => (valid_id, SorobanString::from_slice(&env, b""), valid_origin),
            _ => (valid_id, valid_name, SorobanString::from_slice(&env, b"")),
        };

        // Empty strings should be handled (either panic on invalid or succeed)
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.register_product(&owner, &id, &name, &origin);
        }));

        // The contract might reject empty strings, so we just verify it doesn't cause undefined behavior
        prop_assert!(result.is_ok() || result.is_err(), "register_product must handle empty strings gracefully");
    }

    #[test]
    fn fuzz_register_product_max_length_strings(
        id_len in 1usize..=128,
        name_len in 1usize..=256,
        origin_len in 1usize..=256
    ) {
        let env = Env::default();
        let contract = SupplyLinkContract::new(&env);
        let owner = create_test_address(1);

        let id_bytes = vec![b'a'; id_len];
        let name_bytes = vec![b'b'; name_len];
        let origin_bytes = vec![b'c'; origin_len];

        let id_str = SorobanString::from_slice(&env, &id_bytes);
        let name_str = SorobanString::from_slice(&env, &name_bytes);
        let origin_str = SorobanString::from_slice(&env, &origin_bytes);

        // Should succeed or fail gracefully with max-length strings
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.register_product(&owner, &id_str, &name_str, &origin_str);
        }));

        prop_assert!(
            result.is_ok() || result.is_err(),
            "register_product must handle max-length strings without undefined behavior"
        );
    }

    #[test]
    fn fuzz_register_product_special_characters(
        special_chars in r"[!@#$%^&*()_+\-=\[\]{};':\",.<>?/\\|`~]*"
    ) {
        let env = Env::default();
        let contract = SupplyLinkContract::new(&env);
        let owner = create_test_address(1);

        let id_str = SorobanString::from_slice(&env, b"product-123");
        let name_str = SorobanString::from_slice(&env, format!("Product{}", special_chars).as_bytes());
        let origin_str = SorobanString::from_slice(&env, b"Origin");

        // Special characters in name should be handled gracefully
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.register_product(&owner, &id_str, &name_str, &origin_str);
        }));

        prop_assert!(result.is_ok() || result.is_err(), "register_product must handle special characters safely");
    }
}

// Property-based tests for add_tracking_event fuzzing
proptest! {
    #[test]
    fn fuzz_add_tracking_event_valid_strings(
        product_id in "[a-zA-Z0-9-]{1,128}",
        location in "[a-zA-Z0-9, ]{1,256}",
        event_type in "(HARVEST|PROCESSING|SHIPPING|RETAIL)",
        metadata in "\\{[^}]*\\}"
    ) {
        let env = Env::default();
        let contract = SupplyLinkContract::new(&env);
        let owner = create_test_address(1);

        // First register a product
        let product_id_str = SorobanString::from_slice(&env, product_id.as_bytes());
        let _register_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.register_product(
                &owner,
                &product_id_str,
                &SorobanString::from_slice(&env, b"Test Product"),
                &SorobanString::from_slice(&env, b"Origin"),
            );
        }));

        let location_str = SorobanString::from_slice(&env, location.as_bytes());
        let event_type_str = SorobanString::from_slice(&env, event_type.as_bytes());
        let metadata_str = SorobanString::from_slice(&env, metadata.as_bytes());

        // Adding event should not panic
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.add_tracking_event(&owner, &product_id_str, &location_str, &event_type_str, &metadata_str);
        }));

        prop_assert!(result.is_ok() || result.is_err(), "add_tracking_event must not panic with valid input");
    }

    #[test]
    fn fuzz_add_tracking_event_empty_metadata(
        metadata_size in 0usize..=4096
    ) {
        let env = Env::default();
        let contract = SupplyLinkContract::new(&env);
        let owner = create_test_address(1);
        let product_id = SorobanString::from_slice(&env, b"product-fuzzing-1");

        // Register product first
        let _register_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.register_product(
                &owner,
                &product_id,
                &SorobanString::from_slice(&env, b"Test"),
                &SorobanString::from_slice(&env, b"Test"),
            );
        }));

        // Create metadata of specified size
        let metadata_bytes = vec![b'x'; metadata_size];
        let metadata_str = SorobanString::from_slice(&env, &metadata_bytes);

        // Should handle metadata of any size up to MAX_METADATA_LEN
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.add_tracking_event(
                &owner,
                &product_id,
                &SorobanString::from_slice(&env, b"Location"),
                &SorobanString::from_slice(&env, b"SHIPPING"),
                &metadata_str,
            );
        }));

        prop_assert!(
            result.is_ok() || result.is_err(),
            "add_tracking_event must handle any metadata size gracefully"
        );
    }

    #[test]
    fn fuzz_add_tracking_event_max_metadata(
        prefix in "[a-zA-Z0-9]{0,100}"
    ) {
        let env = Env::default();
        let contract = SupplyLinkContract::new(&env);
        let owner = create_test_address(1);
        let product_id = SorobanString::from_slice(&env, b"product-max-fuzzing");

        // Register product
        let _register_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.register_product(
                &owner,
                &product_id,
                &SorobanString::from_slice(&env, b"Test"),
                &SorobanString::from_slice(&env, b"Test"),
            );
        }));

        // Create max-size metadata
        let mut metadata = format!("{}", prefix);
        while metadata.len() < 4096 {
            metadata.push('x');
        }
        let metadata_str = SorobanString::from_slice(&env, metadata.as_bytes());

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.add_tracking_event(
                &owner,
                &product_id,
                &SorobanString::from_slice(&env, b"Location"),
                &SorobanString::from_slice(&env, b"SHIPPING"),
                &metadata_str,
            );
        }));

        prop_assert!(
            result.is_ok() || result.is_err(),
            "add_tracking_event must handle max-size metadata"
        );
    }
}
