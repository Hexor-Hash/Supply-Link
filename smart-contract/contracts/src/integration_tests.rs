#![cfg(test)]
use soroban_sdk::{
    contractclient::ContractClient, Address, BytesN, Env, String, Symbol, Vec as SdkVec,
    crypto::SecretKey,
};
use supply_link::SupplyLinkContract;
use supply_link::SupplyLinkContractClient;

/// Integration tests that run against a live Soroban RPC endpoint (testnet or local).
///
/// These tests require network access to a Soroban RPC endpoint and a funded
/// test account. By default they use the public testnet and Friendbot for
/// funding.
///
/// Environment variables:
/// - RPC_URL: Soroban RPC endpoint (default: https://soroban-testnet.stellar.org)
/// - RPC_NETWORK_PASSPHRASE: Stellar network passphrase
///     (default: "Test SDF Network ; September 2015")
/// - SOURCE_SECRET_KEY: Secret key for the test account (optional; if not set,
///     a fresh keypair is generated and funded via Friendbot)
///
/// Run:
///   cargo test --test integration_tests --release
///
/// The tests deploy a fresh contract instance per test and clean up implicitly
/// by letting the test accounts be discarded.

#[cfg(test)]
mod integration {
    use super::*;
    use std::env as std_env;

    /// Get RPC URL from environment or use default testnet
    fn rpc_url() -> String {
        std_env::var("RPC_URL").unwrap_or_else(|_| "https://soroban-testnet.stellar.org".to_string())
    }

    /// Get network passphrase from environment
    fn network_passphrase() -> String {
        std_env::var("RPC_NETWORK_PASSPHRASE")
            .unwrap_or_else(|_| "Test SDF Network ; September 2015".to_string())
    }

    /// Get the source account secret key from environment, if provided
    fn source_secret_from_env() -> Option<String> {
        std_env::var("SOURCE_SECRET_KEY").ok()
    }

    /// Generate a fresh keypair for testing
    fn fresh_keypair(env: &Env) -> (SecretKey, Address) {
        let secret = SecretKey::generate(env);
        let public = secret.to_public();
        let address = Address::PublicKey(public);
        (secret, address)
    }

    /// Fund an account via Friendbot (testnet only)
    async fn fund_via_friendbot(public_key: &str) -> Result<(), reqwest::Error> {
        let client = reqwest::Client::new();
        let response = client
            .get(&format!("https://friendbot.stellar.org?addr={}", public_key))
            .send()
            .await;

        match response {
            Ok(res) if res.status().is_success() => {
                println!("Funded {} via Friendbot", public_key);
                Ok(())
            }
            Ok(res) => {
                eprintln!("Friendbot returned status: {}", res.status());
                Ok(()) // still proceed
            }
            Err(e) => {
                eprintln!("Friendbot request failed: {}", e);
                Ok(()) // don't fail test if Friendbot down; test may fail later
            }
        }
    }

    /// Wait a few seconds for transaction confirmation on testnet
    async fn wait_confirm() {
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
    }

    /// Build RPC-backed Env
    fn rpc_env() -> Env {
        Env::with_rpc(&rpc_url(), &network_passphrase())
    }

    /// Generate a unique product ID for this test run
    fn gen_product_id() -> String {
        use std::time::{SystemTime, UNIX_EPOCH};
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        format!("intg-test-{}", ts)
    }

    #[tokio::test]
    async fn test_integration_register_product() {
        let env = rpc_env();

        // If a SOURCE_SECRET_KEY is provided, use it; otherwise generate and fund.
        let (mut source_secret, source_addr) = if let Some(secret_str) = source_secret_from_env() {
            // Parse the secret key string (Freighter format: "S...")
            // Note: This requires the `soroban-sdk` crypto parsing support.
            // Fallback to generation if parsing fails.
            match SecretKey::from_string(&secret_str) {
                Ok(secret) => {
                    let pub_key = secret.to_public();
                    let addr = Address::PublicKey(pub_key);
                    (secret, addr)
                }
                Err(_) => {
                    let (s, a) = fresh_keypair(&env);
                    (s, a)
                }
            }
        } else {
            fresh_keypair(&env)
        };

        // Ensure account is funded if on testnet and using a new key
        let is_testnet = network_passphrase().contains("Test SDF");
        if is_testnet && source_secret_from_env().is_none() {
            let pub_str = source_addr.to_string();
            let _ = fund_via_friendbot(&pub_str).await;
            wait_confirm().await;
        }

        // Set as RPC source
        env.rpc_set_source(Some(&source_secret));

        // Deploy contract
        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        // Register a product
        let owner = source_addr.clone();
        let product_id = gen_product_id();
        let name = String::from_str(&env, "Integration Test Product");
        let origin = String::from_str(&env, "Test Origin");
        let required_sigs = 0u32;

        client.register_product(
            &String::from_str(&env, &product_id),
            &name,
            &origin,
            &owner,
            &required_sigs,
        );

        // Verify
        let product = client.get_product(&String::from_str(&env, &product_id));
        assert_eq!(product.id.to_string(), product_id);
        assert_eq!(product.name.to_string(), "Integration Test Product");
        assert_eq!(product.owner, owner);
    }

    #[tokio::test]
    async fn test_integration_add_tracking_event() {
        let env = rpc_env();

        let (source_secret, source_addr) = match source_secret_from_env() {
            Some(secret_str) => match SecretKey::from_string(&secret_str) {
                Ok(secret) => {
                    let pub_key = secret.to_public();
                    let addr = Address::PublicKey(pub_key);
                    (secret, addr)
                }
                Err(_) => fresh_keypair(&env),
            },
            None => fresh_keypair(&env),
        };

        let is_testnet = network_passphrase().contains("Test SDF");
        if is_testnet && source_secret_from_env().is_none() {
            let pub_str = source_addr.to_string();
            let _ = fund_via_friendbot(&pub_str).await;
            wait_confirm().await;
        }

        env.rpc_set_source(Some(&source_secret));

        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        let owner = source_addr.clone();
        let product_id = gen_product_id();

        // Register product
        client.register_product(
            &String::from_str(&env, &product_id),
            &String::from_str(&env, "Test Product"),
            &String::from_str(&env, "Origin"),
            &owner,
            &0u32,
        );

        // Add tracking event
        let caller = owner.clone();
        let location = String::from_str(&env, "Warehouse A");
        let event_type = String::from_str(&env, "SHIPPING");
        let metadata = String::from_str(&env, r#"{"temperature":"4°C"}"#);

        client.add_tracking_event(
            &String::from_str(&env, &product_id),
            &caller,
            &location,
            &event_type,
            &metadata,
        );

        // Verify
        let events = client.get_tracking_events(&String::from_str(&env, &product_id));
        assert_eq!(events.len(), 1);
        let ev = events.get(0).unwrap();
        assert_eq!(ev.location.to_string(), "Warehouse A");
        assert_eq!(ev.event_type.to_string(), "SHIPPING");
    }

    #[tokio::test]
    async fn test_integration_get_tracking_events() {
        let env = rpc_env();

        let (source_secret, source_addr) = match source_secret_from_env() {
            Some(secret_str) => match SecretKey::from_string(&secret_str) {
                Ok(secret) => {
                    let pub_key = secret.to_public();
                    let addr = Address::PublicKey(pub_key);
                    (secret, addr)
                }
                Err(_) => fresh_keypair(&env),
            },
            None => fresh_keypair(&env),
        };

        let is_testnet = network_passphrase().contains("Test SDF");
        if is_testnet && source_secret_from_env().is_none() {
            let pub_str = source_addr.to_string();
            let _ = fund_via_friendbot(&pub_str).await;
            wait_confirm().await;
        }

        env.rpc_set_source(Some(&source_secret));

        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        let owner = source_addr.clone();
        let product_id = gen_product_id();

        client.register_product(
            &String::from_str(&env, &product_id),
            &String::from_str(&env, "Test Product"),
            &String::from_str(&env, "Origin"),
            &owner,
            &0u32,
        );

        // Add multiple events
        for i in 0..3 {
            client.add_tracking_event(
                &String::from_str(&env, &product_id),
                &owner,
                &String::from_str(&env, &format!("Location {}", i)),
                &String::from_str(&env, "SHIPPING"),
                &String::from_str(&env, &format!("{{\"seq\":{}}}", i)),
            );
        }

        let events = client.get_tracking_events(&String::from_str(&env, &product_id));
        assert_eq!(events.len(), 3);
        for i in 0..3 {
            let ev = events.get(i as u32).unwrap();
            assert_eq!(ev.event_type.to_string(), "SHIPPING");
        }
    }

    #[tokio::test]
    async fn test_integration_transfer_ownership() {
        let env = rpc_env();

        let (source_secret, source_addr) = match source_secret_from_env() {
            Some(secret_str) => match SecretKey::from_string(&secret_str) {
                Ok(secret) => {
                    let pub_key = secret.to_public();
                    let addr = Address::PublicKey(pub_key);
                    (secret, addr)
                }
                Err(_) => fresh_keypair(&env),
            },
            None => fresh_keypair(&env),
        };

        let is_testnet = network_passphrase().contains("Test SDF");
        if is_testnet && source_secret_from_env().is_none() {
            let pub_str = source_addr.to_string();
            let _ = fund_via_friendbot(&pub_str).await;
            wait_confirm().await;
        }

        env.rpc_set_source(Some(&source_secret));

        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        let owner = source_addr.clone();
        let (new_owner_secret, new_owner_addr) = fresh_keypair(&env);
        let product_id = gen_product_id();

        client.register_product(
            &String::from_str(&env, &product_id),
            &String::from_str(&env, "Test Product"),
            &String::from_str(&env, "Origin"),
            &owner,
            &0u32,
        );

        // Transfer ownership: nonce = 0 initially
        client.transfer_ownership(
            &String::from_str(&env, &product_id),
            &new_owner_addr,
            &0u64,
        );

        // Verify new owner
        let product = client.get_product(&String::from_str(&env, &product_id));
        assert_eq!(product.owner, new_owner_addr);
        assert_ne!(product.owner, owner);
    }

    #[tokio::test]
    async fn test_integration_full_product_lifecycle() {
        let env = rpc_env();

        let (source_secret, source_addr) = match source_secret_from_env() {
            Some(secret_str) => match SecretKey::from_string(&secret_str) {
                Ok(secret) => {
                    let pub_key = secret.to_public();
                    let addr = Address::PublicKey(pub_key);
                    (secret, addr)
                }
                Err(_) => fresh_keypair(&env),
            },
            None => fresh_keypair(&env),
        };

        let is_testnet = network_passphrase().contains("Test SDF");
        if is_testnet && source_secret_from_env().is_none() {
            let pub_str = source_addr.to_string();
            let _ = fund_via_friendbot(&pub_str).await;
            wait_confirm().await;
        }

        env.rpc_set_source(Some(&source_secret));

        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        let owner = source_addr.clone();
        let (new_owner_secret, new_owner_addr) = fresh_keypair(&env);
        let product_id = gen_product_id();

        // 1. Register product
        client.register_product(
            &String::from_str(&env, &product_id),
            &String::from_str(&env, "Full Lifecycle Product"),
            &String::from_str(&env, "Factory A"),
            &owner,
            &0u32,
        );

        // 2. Add multiple events (owner)
        let stages = ["HARVEST", "PROCESSING", "SHIPPING", "RETAIL"];
        for stage in stages.iter() {
            client.add_tracking_event(
                &String::from_str(&env, &product_id),
                &owner,
                &String::from_str(&env, &format!("{} location", stage)),
                &String::from_str(&env, stage),
                &String::from_str(&env, "{}"),
            );
        }

        // 3. Verify event count
        let events = client.get_tracking_events(&String::from_str(&env, &product_id));
        assert_eq!(events.len(), 4);

        // 4. Transfer ownership (nonce 0)
        client.transfer_ownership(
            &String::from_str(&env, &product_id),
            &new_owner_addr,
            &0u64,
        );

        // 5. Switch source to new owner and add an event
        env.rpc_set_source(Some(&new_owner_secret));
        client.add_tracking_event(
            &String::from_str(&env, &product_id),
            &new_owner_addr,
            &String::from_str(&env, "Retail Store"),
            &String::from_str(&env, "RETAIL"),
            &String::from_str(&env, r#"{"sold":true}"#),
        );

        // 6. Final verification
        let final_events = client.get_tracking_events(&String::from_str(&env, &product_id));
        assert_eq!(final_events.len(), 5);
        let product = client.get_product(&String::from_str(&env, &product_id));
        assert_eq!(product.owner, new_owner_addr);
    }
}
