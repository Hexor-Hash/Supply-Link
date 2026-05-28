# Supply-Link — Producer User Guide

> **Who this guide is for:** Anyone who wants to register a physical product on the Stellar blockchain and track its journey through the supply chain — no prior blockchain experience required.

---

## Table of Contents

1. [What you'll need](#1-what-youll-need)
2. [Install the Freighter Wallet](#2-install-the-freighter-wallet)
3. [Create a wallet and fund your testnet account](#3-create-a-wallet-and-fund-your-testnet-account)
4. [Connect your wallet to Supply-Link](#4-connect-your-wallet-to-supply-link)
5. [Register a product](#5-register-a-product)
6. [Add tracking events](#6-add-tracking-events)
7. [Authorize supply chain partners](#7-authorize-supply-chain-partners)
8. [Share the QR code](#8-share-the-qr-code)
9. [Transfer product ownership](#9-transfer-product-ownership)
10. [Verify a product (consumer view)](#10-verify-a-product-consumer-view)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. What you'll need

| Requirement | Details |
|---|---|
| Browser | Chrome or Firefox (desktop) |
| Freighter extension | Free wallet for Stellar — [freighter.app](https://freighter.app) |
| Testnet XLM | Free test tokens from Stellar Friendbot |
| Supply-Link app | Running locally or at the live URL |

> **Testnet vs Mainnet:** This guide uses the Stellar **testnet**. Testnet tokens have no real value — they're free and safe to experiment with. When you're ready for production, the same steps apply on mainnet.

---

## 2. Install the Freighter Wallet

Freighter is a browser extension that acts as your Stellar wallet. It signs transactions without ever exposing your private key to the app.

**Steps:**

1. Open [freighter.app](https://freighter.app) in your browser.
2. Click **Add to Chrome** (or **Add to Firefox**).
3. Confirm the browser prompt to install the extension.
4. Click the Freighter icon in your browser toolbar to open it.
5. Click **Create New Wallet**.
6. Choose a strong password and confirm it.
7. Write down your **12-word recovery phrase** and store it somewhere safe — this is the only way to recover your wallet if you lose access.
8. Confirm the recovery phrase when prompted.

Your wallet is now set up. You'll see your Stellar address — it starts with `G` and is 56 characters long.

> ⚠️ **Never share your recovery phrase or private key with anyone, including Supply-Link.**

---

## 3. Create a wallet and fund your testnet account

Before you can register products, your wallet needs a small amount of XLM to pay transaction fees (fractions of a cent on testnet).

**Switch to Testnet:**

1. Click the Freighter extension icon.
2. Click the network name at the top (it may say "Mainnet").
3. Select **Testnet** from the dropdown.

**Fund your account with free testnet XLM:**

1. Copy your wallet address from Freighter (click the address to copy it).
2. Open [laboratory.stellar.org/account-creator](https://laboratory.stellar.org/account-creator) in a new tab.
3. Paste your address into the **Public Key** field.
4. Click **Get test network lumens**.
5. Wait a few seconds — you'll see a success message.
6. Return to Freighter and refresh. You should see **10,000 XLM** in your balance.

> Testnet XLM is free and unlimited. You can fund your account again any time.

---

## 4. Connect your wallet to Supply-Link

1. Open the Supply-Link app (e.g. `http://localhost:3000` if running locally).
2. Click **Get Started** or navigate to the **Dashboard**.
3. In the top-right corner, click **Connect Freighter**.
4. Freighter will open a popup asking you to approve the connection — click **Connect**.
5. Your wallet address will appear in the navbar (e.g. `GABC12…XY56`), along with your XLM balance.

**Network mismatch warning:** If you see a yellow banner saying "Network Mismatch", your Freighter is set to a different network than the app. Switch Freighter to **Testnet** (see step above) and reconnect.

---

## 5. Register a product

Registering a product creates an immutable on-chain record with a unique ID. You become the product's owner.

1. Click **Products** in the sidebar.
2. Click **Register New Product** (top-right button).
3. A modal dialog opens. Fill in the fields:

   | Field | Description | Example |
   |---|---|---|
   | **Product ID** | Auto-generated unique ID. Click 🔄 to regenerate. | `prod-a1b2c3d4` |
   | **Name** | Human-readable product name | `Organic Coffee Beans` |
   | **Origin** | Where the product originates | `Yirgacheffe, Ethiopia` |
   | **Description** | Optional extra details | `Single-origin, shade-grown` |

4. Click **Register Product**.
5. Freighter will open a popup showing the transaction details — review it and click **Approve**.
6. Wait a few seconds for the transaction to confirm on-chain.
7. A success toast appears with the transaction hash. Your product now appears in the product list.

> **What happens on-chain:** A `register_product` call is submitted to the Soroban contract. The product is stored permanently on the Stellar blockchain with your wallet address as the owner.

---

## 6. Add tracking events

Tracking events record each step in the product's journey — harvest, processing, shipping, and retail.

1. Click **Tracking** in the sidebar.
2. Select your product from the **Select Product** dropdown.
3. Click **Add Event** (top-right button).
4. Fill in the event form:

   | Field | Description | Example |
   |---|---|---|
   | **Product ID** | Pre-filled from your selection | `prod-a1b2c3d4` |
   | **Location** | Where this event occurred | `Port of Djibouti` |
   | **Event Type** | Stage in the supply chain | `SHIPPING` |
   | **Metadata** | Optional JSON with extra data | `{"vessel": "MV Stellar", "destination": "Rotterdam"}` |

   **Event types:**
   - 🌱 `HARVEST` — Product was harvested or manufactured
   - ⚙️ `PROCESSING` — Product was processed or transformed
   - 🚢 `SHIPPING` — Product was shipped or transported
   - 🏪 `RETAIL` — Product arrived at retail location

5. Click **Add Event**.
6. Approve the transaction in Freighter.
7. The event appears in the **Event History** timeline below.

> **Metadata tip:** Use JSON to record structured data like temperature, humidity, batch numbers, certifications, or any other relevant information. Example: `{"temperature_c": 4, "humidity_pct": 85, "cert": "organic-EU"}`

---

## 7. Authorize supply chain partners

By default, only you (the product owner) can add events. To allow logistics partners, processors, or retailers to log their own events, you need to authorize their wallet addresses.

1. Click **Products** in the sidebar.
2. Click on your product to open the detail page.
3. Scroll to the **Authorized Actors** section.
4. In the input field, paste the Stellar address of the partner you want to authorize (starts with `G`, 56 characters).
5. Click **Add**.
6. Approve the transaction in Freighter.

The partner's address now appears in the list. They can now call `add_tracking_event` for this product using their own wallet.

**To remove an actor:**
- Click the 🗑️ trash icon next to their address.
- Approve the transaction in Freighter.

> **Security note:** Only authorize addresses you trust. Authorized actors can add events but cannot transfer ownership or authorize other actors.

---

## 8. Share the QR code

Every product gets a unique QR code that links to its public verification page. Anyone can scan it — no wallet required.

**From the Products page:**
- Each product card displays its QR code.
- Click **Download QR** to save it as a PNG file.

**From the Product detail page:**
- The QR code is shown in the top-right of the page.
- Click **Download QR** to save it.

**What the QR code links to:**
The QR code points to `https://your-app.com/verify/<product-id>`. This page shows:
- Product name, origin, and registration date
- Current owner address
- Full event timeline (all tracking events in chronological order)
- A "Verified on Stellar" badge linking to the contract on Stellar Expert

**Printing and labeling:**
- Download the QR PNG and print it on product labels, packaging, or certificates.
- Consumers scan it with any smartphone camera — no app required.

---

## 9. Transfer product ownership

When a product changes hands (e.g. from producer to distributor), you can transfer on-chain ownership.

1. Click **Products** in the sidebar.
2. Click on the product to open its detail page.
3. Scroll to the **Actions** section and click **Transfer Ownership**.
4. Enter the new owner's Stellar address (starts with `G`, 56 characters).
5. Click **Review Transfer**.
6. A confirmation dialog shows the irreversible warning — review the address carefully.
7. Click **Confirm Transfer**.
8. Approve the transaction in Freighter.

> ⚠️ **This cannot be undone.** Once transferred, only the new owner can manage the product. Double-check the address before confirming.

---

## 10. Verify a product (consumer view)

This is what your customers see when they scan the QR code.

1. Scan the QR code on the product with your phone camera.
2. The browser opens the verification page at `/verify/<product-id>`.
3. The page shows:
   - Product name and origin
   - Registration date and current owner
   - Complete event timeline with timestamps and locations
   - A **Verified on Stellar** badge

No wallet, no account, no app needed — just a camera.

---

## 11. Troubleshooting

**"Freighter is not installed"**
- Install the Freighter extension from [freighter.app](https://freighter.app) and refresh the page.

**"Network Mismatch" banner**
- Open Freighter, click the network name, and switch to **Testnet**.
- Disconnect and reconnect your wallet in Supply-Link.

**Transaction fails with "insufficient balance"**
- Your wallet needs XLM to pay fees. Fund it at [laboratory.stellar.org/account-creator](https://laboratory.stellar.org/account-creator).

**Transaction fails with "caller is not authorized"**
- You're trying to add an event for a product you don't own and aren't authorized for.
- Ask the product owner to add your address as an authorized actor (see [Step 7](#7-authorize-supply-chain-partners)).

**Product not found on verification page**
- The product ID in the QR code may not match a registered product on the current network.
- Make sure the app is connected to the same network (testnet/mainnet) where the product was registered.

**Freighter popup doesn't appear**
- Check if your browser is blocking popups for the app's domain.
- Try clicking the Freighter extension icon manually to approve pending requests.

---

## Need help?

- Open an issue on [GitHub](https://github.com/your-org/supply-link/issues)
- Read the [Stellar developer docs](https://developers.stellar.org)
- Learn about [Freighter wallet](https://docs.freighter.app)

---

*Back to [README](../README.md)*
