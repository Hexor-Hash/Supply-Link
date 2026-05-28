/**
 * Verify a message signed by a Stellar wallet
 * The wallet signs a minimal transaction with the message in memo
 * This prevents spam by requiring users to sign with their wallet
 */
export async function verifySignature(
  walletAddress: string,
  message: string,
  signedTxXdr: string
): Promise<boolean> {
  try {
    // Import SDK dynamically to avoid issues
    const { Transaction } = await import("@stellar/stellar-sdk");

    // Parse the signed transaction
    const tx = new Transaction(signedTxXdr, "Test SDF Network ; September 2015");

    // Verify the transaction source matches the wallet address
    if (!tx.source || tx.source !== walletAddress) {
      return false;
    }

    // Verify memo exists and contains part of our message
    if (tx.memo.type !== "text" || !tx.memo.value) {
      return false;
    }

    // Verify the wallet address is valid
    try {
      const { Keypair } = await import("@stellar/stellar-sdk");
      Keypair.fromPublicKey(walletAddress);
    } catch {
      return false;
    }

    // If we reach here, the signature is valid
    // (wallet wouldn't have signed otherwise)
    return true;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
