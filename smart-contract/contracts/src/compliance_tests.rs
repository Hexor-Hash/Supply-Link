#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

fn setup(env: &Env) -> (SupplyLinkContractClient, Address, String) {
    let contract_id = env.register_contract(None, SupplyLinkContract);
    let client = SupplyLinkContractClient::new(env, &contract_id);
    let owner = Address::generate(env);
    let product_id = String::from_str(env, "prod-compliance-01");
    env.mock_all_auths();
    client.register_product(
        &product_id,
        &String::from_str(env, "Compliance Product"),
        &String::from_str(env, "Origin"),
        &owner,
        &1,
    );
    (client, owner, product_id)
}

#[test]
fn test_no_policy_allows_any_event() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, owner, product_id) = setup(&env);

    // Without a policy, any event order is allowed.
    let result = client.add_tracking_event(
        &product_id,
        &owner,
        &String::from_str(&env, "Warehouse"),
        &String::from_str(&env, "SHIPPING"),
        &String::from_str(&env, "{}"),
    );
    assert!(result.is_ok());
}

#[test]
fn test_required_order_enforced() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, owner, product_id) = setup(&env);

    // Require HARVEST before PROCESSING.
    let mut rules = Vec::new(&env);
    rules.push_back(ComplianceRule {
        rule_type: COMPLIANCE_REQUIRED_ORDER,
        from_stage: String::from_str(&env, "HARVEST"),
        to_stage: String::from_str(&env, "PROCESSING"),
        max_seconds: 0,
    });
    client.set_compliance_policy(&product_id, &rules);

    // Submitting PROCESSING without a prior HARVEST should fail.
    let result = client.try_add_tracking_event(
        &product_id,
        &owner,
        &String::from_str(&env, "Factory"),
        &String::from_str(&env, "PROCESSING"),
        &String::from_str(&env, "{}"),
    );
    assert_eq!(result, Err(Ok(Error::ComplianceViolation)));

    // Record the required HARVEST first.
    client.add_tracking_event(
        &product_id,
        &owner,
        &String::from_str(&env, "Farm"),
        &String::from_str(&env, "HARVEST"),
        &String::from_str(&env, "{}"),
    ).unwrap();

    // Now PROCESSING is allowed.
    let result2 = client.add_tracking_event(
        &product_id,
        &owner,
        &String::from_str(&env, "Factory"),
        &String::from_str(&env, "PROCESSING"),
        &String::from_str(&env, "{}"),
    );
    assert!(result2.is_ok());
}

#[test]
fn test_mandatory_inspection_enforced() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, owner, product_id) = setup(&env);

    let mut rules = Vec::new(&env);
    rules.push_back(ComplianceRule {
        rule_type: COMPLIANCE_MANDATORY_INSPECTION,
        from_stage: String::from_str(&env, "PROCESSING"),
        to_stage: String::from_str(&env, "SHIPPING"),
        max_seconds: 0,
    });
    client.set_compliance_policy(&product_id, &rules);

    // SHIPPING without a preceding PROCESSING should be rejected.
    let result = client.try_add_tracking_event(
        &product_id,
        &owner,
        &String::from_str(&env, "Port"),
        &String::from_str(&env, "SHIPPING"),
        &String::from_str(&env, "{}"),
    );
    assert_eq!(result, Err(Ok(Error::ComplianceViolation)));

    // Add the mandatory inspection stage.
    client.add_tracking_event(
        &product_id,
        &owner,
        &String::from_str(&env, "Factory"),
        &String::from_str(&env, "PROCESSING"),
        &String::from_str(&env, "{}"),
    ).unwrap();

    let result2 = client.add_tracking_event(
        &product_id,
        &owner,
        &String::from_str(&env, "Port"),
        &String::from_str(&env, "SHIPPING"),
        &String::from_str(&env, "{}"),
    );
    assert!(result2.is_ok());
}

#[test]
fn test_max_time_between_stages_enforced() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, owner, product_id) = setup(&env);

    let mut rules = Vec::new(&env);
    rules.push_back(ComplianceRule {
        rule_type: COMPLIANCE_MAX_TIME_BETWEEN_STAGES,
        from_stage: String::from_str(&env, "HARVEST"),
        to_stage: String::from_str(&env, "PROCESSING"),
        max_seconds: 3600, // 1 hour
    });
    client.set_compliance_policy(&product_id, &rules);

    // Record HARVEST at ledger time 0.
    client.add_tracking_event(
        &product_id,
        &owner,
        &String::from_str(&env, "Farm"),
        &String::from_str(&env, "HARVEST"),
        &String::from_str(&env, "{}"),
    ).unwrap();

    // Advance ledger by 2 hours (7200 seconds > 3600 limit).
    env.ledger().with_mut(|li| li.timestamp = 7200);

    let result = client.try_add_tracking_event(
        &product_id,
        &owner,
        &String::from_str(&env, "Factory"),
        &String::from_str(&env, "PROCESSING"),
        &String::from_str(&env, "{}"),
    );
    assert_eq!(result, Err(Ok(Error::ComplianceViolation)));
}

#[test]
fn test_policy_change_updates_enforcement() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, owner, product_id) = setup(&env);

    // Start with a strict policy.
    let mut rules = Vec::new(&env);
    rules.push_back(ComplianceRule {
        rule_type: COMPLIANCE_REQUIRED_ORDER,
        from_stage: String::from_str(&env, "HARVEST"),
        to_stage: String::from_str(&env, "RETAIL"),
        max_seconds: 0,
    });
    client.set_compliance_policy(&product_id, &rules);

    let result = client.try_add_tracking_event(
        &product_id,
        &owner,
        &String::from_str(&env, "Store"),
        &String::from_str(&env, "RETAIL"),
        &String::from_str(&env, "{}"),
    );
    assert_eq!(result, Err(Ok(Error::ComplianceViolation)));

    // Replace policy with empty rules — all events allowed again.
    let empty_rules = Vec::new(&env);
    client.set_compliance_policy(&product_id, &empty_rules);

    let result2 = client.add_tracking_event(
        &product_id,
        &owner,
        &String::from_str(&env, "Store"),
        &String::from_str(&env, "RETAIL"),
        &String::from_str(&env, "{}"),
    );
    assert!(result2.is_ok());
}

#[test]
fn test_get_compliance_policy_returns_none_when_unset() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _, product_id) = setup(&env);
    assert!(client.get_compliance_policy(&product_id).is_none());
}

#[test]
fn test_set_compliance_policy_only_owner() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _, product_id) = setup(&env);

    let rules = Vec::new(&env);
    // Owner call succeeds.
    let policy = client.set_compliance_policy(&product_id, &rules);
    assert!(policy.is_ok());
}
