# VaultVerse — Security & Cryptographic Architecture

---

## 1. Threat Model & Security Philosophy

VaultVerse operates under the **Zero-Trust & Data Minimization** paradigm:
1. **Compromised Storage Node Resilience**: Even if the file storage volume or MongoDB instance is exfiltrated, an attacker obtains only AES-256-GCM encrypted binary blobs (`.enc`) and encrypted DEK envelopes. Without the Key Encryption Key (KEK) stored outside the database in secure runtime environment variables, the ciphertext cannot be decrypted.
2. **Zero Plaintext Egress during Privacy Scanning**: Deterministic PII identification executes strictly in-process (or in client threads), evaluating regular expressions and MOD-10/MOD-97 checksums without transmitting document bytes to third-party AI APIs.
3. **No Cleartext Tokens in Persistence**: Sharing tokens and emergency invitation tokens are hashed with SHA-256 before storage.
4. **Forensic Immutability**: Any retroactive database tampering breaks the SHA-256 hash chain and is immediately flagged by the verification engine.

---

## 2. NIST SP 800-38D AES-256-GCM AEAD Specification

VaultVerse uses **Galois/Counter Mode (GCM)** with 256-bit keys, conforming to NIST Special Publication 800-38D.

### Parameters:
- **Cipher Algorithm**: `aes-256-gcm`
- **Key Length**: 256 bits (32 bytes)
- **Initialization Vector (IV)**: 96 bits (12 bytes), generated via cryptographically secure pseudo-random number generator (`crypto.randomBytes(12)`).
- **Authentication Tag**: 128 bits (16 bytes), verifying ciphertext authenticity and preventing padding-oracle or bit-flipping attacks.

```
+-----------------------------------------------------------------------------------------+
|                                    AES-256-GCM Pipeline                                  |
|                                                                                         |
|  Plaintext File Bytes ----------------------------+                                     |
|                                                   |                                     |
|  Random 256-bit DEK ------> [ AES-256-GCM Cipher ] ----> Ciphertext File (.enc on disk) |
|                                                   |                                     |
|  Random 96-bit IV --------+                       +----> 128-bit Authentication Tag     |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Envelope Encryption & Key Management Lifecycle

```
Master Key (KEK in ENV)
        │
        ▼  (Encrypts DEK)
+─────────────────────────────────+
|      Wrapped DEK Envelope       |
|  {                              |
|    "iv": "96-bit hex",          |
|    "tag": "128-bit hex",        |
|    "data": "encrypted-dek-hex"  |
|  }                              |
+─────────────────────────────────+
        │
        ▼  (Stored in MongoDB Document metadata)
```

### Key Rotation Procedure:
1. When rotating `VAULT_MASTER_KEY` to a new key ($K_{\text{new}}$):
2. Load each `Document` record.
3. Unwrap the DEK using the previous master key ($K_{\text{old}}$):
   $$\text{DEK} = \text{unwrapKey}(\text{encryptedDek}, K_{\text{old}})$$
4. Re-wrap the DEK with $K_{\text{new}}$:
   $$\text{newEnvelope} = \text{wrapKey}(\text{DEK}, K_{\text{new}})$$
5. Save the updated `encryptedDek` envelope back to MongoDB.
6. The actual document ciphertext files (which can be gigabytes in size) remain completely untouched on disk!

---

## 4. Hash Chaining Forensic Audit Architecture

Each log record $R_n$ computes its cryptographic digest:
$$\text{logHash}_n = \text{SHA-256}\left(\text{previousLogHash} \,\|\, \text{actionType} \,\|\, \text{entityType} \,\|\, \text{entityId} \,\|\, \text{userId} \,\|\, \text{ipHash} \,\|\, \text{status} \,\|\, \text{metadata} \,\|\, \text{createdAt}\right)$$

### Verification Process:
The `verifyAuditChain()` algorithm:
1. Retrieves all audit records sorted chronologically by `createdAt`.
2. Validates that $R_0.\text{previousLogHash} == \text{GENESIS\_HASH}$ (`0000000000000000000000000000000000000000000000000000000000000000`).
3. For each $i \in [1, N-1]$, verifies $R_i.\text{previousLogHash} == R_{i-1}.\text{logHash}$.
4. Re-computes the SHA-256 hash of all fields in $R_i$ and asserts that $\text{calculatedHash} == R_i.\text{logHash}$.
5. If any database administrator or intruder updates a record's action, status, or timestamp, verification fails at that exact index with an immutable mathematical proof of tampering.

