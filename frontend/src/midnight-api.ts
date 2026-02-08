// Midnight SDK imports - loaded dynamically to prevent crashes
let Contract: any = null;
let CompiledContract: any = null;
let deployContract: any = null;
let findDeployedContract: any = null;
let indexerPublicDataProvider: any = null;
let httpClientProofProvider: any = null;
let ShieldedCoinPublicKey: any = null;
let ShieldedEncryptionPublicKey: any = null;
let MidnightBech32m: any = null;
let Transaction: any = null; // Ledger Transaction for serialization
let midnightLoaded = false;
let loadError: any = null;

// Helper: Uint8Array to hex string
const toHex = (bytes: Uint8Array): string => 
  Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

// Helper: hex string to Uint8Array  
const fromHex = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
};

// Simple in-memory private state provider for browser
const createBrowserPrivateStateProvider = () => {
  const storage = new Map<string, any>();
  return {
    get: async (key: string) => storage.get(key),
    set: async (key: string, value: any) => { storage.set(key, value); },
    delete: async (key: string) => { storage.delete(key); },
    clear: async () => { storage.clear(); },
    entries: async function* () { yield* storage.entries(); },
  };
};

// Try to load Midnight dependencies
const tryLoadMidnight = async () => {
  if (midnightLoaded) return true;
  if (loadError) return false;
  
  try {
    // Load each module separately to identify which one fails
    console.log('Loading contract module...');
    const contractMod = await import('@contract/managed/diploma/contract/index.js');
    Contract = contractMod.Contract;
    console.log('✓ Contract loaded');
    
    console.log('Loading compact-js...');
    const compactMod = await import('@midnight-ntwrk/compact-js');
    CompiledContract = compactMod.CompiledContract;
    console.log('✓ CompiledContract loaded');
    
    console.log('Loading midnight-js-contracts...');
    const contractsMod = await import('@midnight-ntwrk/midnight-js-contracts');
    deployContract = contractsMod.deployContract;
    findDeployedContract = contractsMod.findDeployedContract;
    console.log('✓ Contract functions loaded');
    
    console.log('Loading indexer provider...');
    const indexerMod = await import('@midnight-ntwrk/midnight-js-indexer-public-data-provider');
    indexerPublicDataProvider = indexerMod.indexerPublicDataProvider;
    console.log('✓ Indexer provider loaded');
    
    console.log('Loading address format utilities...');
    const addressMod = await import('@midnight-ntwrk/wallet-sdk-address-format');
    ShieldedCoinPublicKey = addressMod.ShieldedCoinPublicKey;
    ShieldedEncryptionPublicKey = addressMod.ShieldedEncryptionPublicKey;
    MidnightBech32m = addressMod.MidnightBech32m;
    console.log('✓ Address format utilities loaded');

    console.log('Loading HTTP proof provider...');
    const proofMod = await import('@midnight-ntwrk/midnight-js-http-client-proof-provider');
    httpClientProofProvider = proofMod.httpClientProofProvider;
    console.log('✓ HTTP proof provider loaded');

    console.log('Loading ledger for transaction serialization...');
    const ledgerMod = await import('@midnight-ntwrk/ledger');
    Transaction = ledgerMod.Transaction;
    console.log('✓ Ledger Transaction loaded');

    // Skip LevelDB provider - use browser-compatible in-memory provider
    console.log('Using browser-compatible private state provider...');
    
    midnightLoaded = true;
    console.log('All Midnight SDK modules loaded successfully');
    return true;
  } catch (e: any) {
    loadError = e;
    console.error('Midnight SDK load error at step:', e.message || e);
    return false;
  }
};

/**
 * PrivateDiploma - Private state for credential verification
 */
export interface DiplomaPrivateState {
  credentialSecret: Uint8Array;
}

export interface RegisterCredentialResult {
    txHash: string;
    contractAddress: string;
}

/**
 * PrivateDiploma Browser API Wrapper
 * Enables privacy-preserving credential verification via Lace Wallet
 */
export class MidnightDAppAPI {
  private diplomaCompiledContract: any;
  private providers: any;
  private walletAddressBytes: Uint8Array | null = null;
  private shieldedAddress: string | null = null;

  constructor() { }
  
  // Get the holder address bytes for contract calls
  getHolderAddressBytes(): Uint8Array {
    if (this.walletAddressBytes) return this.walletAddressBytes;
    // Fallback: return 32 zero bytes if not available
    return new Uint8Array(32);
  }
  
  getShieldedAddress(): string | null {
    return this.shieldedAddress;
  }

  async initialize(walletAPI: any) {
    // Load Midnight SDK
    const loaded = await tryLoadMidnight();
    if (!loaded) {
      throw new Error('Midnight SDK not available - ensure all dependencies are installed');
    }
    
    const config = await walletAPI.getConfiguration();
    console.log('Wallet config:', config);
    
    // ZK Resources fetcher - fetch from proof server
    const proofServerUri = config.proofServerUri || 'http://localhost:6300';
    
    const fetchResource = async (path: string) => {
      console.log('Fetching ZK resource:', path);
      const resp = await fetch(path);
      if (!resp.ok) {
        console.error(`Failed to fetch ZK resource: ${path}, status: ${resp.status}`);
        throw new Error(`Failed to fetch ZK resource: ${path}`);
      }
      const ab = await resp.arrayBuffer();
      console.log(`Fetched ${path}: ${ab.byteLength} bytes`);
      return new Uint8Array(ab);
    };

    const keyMaterialProvider = {
      getZKIR: async (c: string) => fetchResource(`/zkir/${c}.zkir`),
      getProverKey: async (c: string) => fetchResource(`/keys/${c}.prover`),
      getVerifierKey: async (c: string) => fetchResource(`/keys/${c}.verifier`),
    };

    // Try to get the wallet's proving provider first (preferred)
    // Fall back to HTTP proof provider if wallet doesn't support it
    let proofProvider: any;
    try {
      console.log('Attempting to get wallet proving provider...');
      proofProvider = await walletAPI.getProvingProvider(keyMaterialProvider);
      console.log('✓ Got wallet proving provider');
    } catch (e: any) {
      console.log('Wallet proving provider not available, falling back to HTTP:', e.message);
      console.log('Creating HTTP proof provider at:', proofServerUri);
      proofProvider = httpClientProofProvider(proofServerUri);
      console.log('✓ HTTP proof provider created');
    }

    // Cache wallet addresses to avoid repeated async calls
    const walletAddresses = await walletAPI.getShieldedAddresses();
    console.log('Wallet addresses received:', Object.keys(walletAddresses), walletAddresses);
    
    // Store the shielded address for later use
    this.shieldedAddress = walletAddresses.shieldedAddress || '';
    
    // Convert shielded address to bytes for contract calls
    // The shielded address is a bech32 string - we hash it to get 32 bytes for the contract
    if (this.shieldedAddress && typeof this.shieldedAddress === 'string') {
      // Use a simple hash to derive 32 bytes from the address string  
      const encoder = new TextEncoder();
      const addressBytes = encoder.encode(this.shieldedAddress);
      // Simple hash: take first 32 bytes padded/truncated
      this.walletAddressBytes = new Uint8Array(32);
      for (let i = 0; i < Math.min(addressBytes.length, 32); i++) {
        this.walletAddressBytes[i] = addressBytes[i];
      }
      console.log('Wallet address bytes created from shielded address');
    }
    
    // The wallet API may return different property names - handle various formats
    const coinPublicKey = walletAddresses.shieldedCoinPublicKey 
      || walletAddresses.coinPublicKey 
      || walletAddresses.publicKey
      || walletAddresses.shieldedAddress;
    const encryptionPublicKey = walletAddresses.shieldedEncryptionPublicKey 
      || walletAddresses.encryptionPublicKey 
      || walletAddresses.shieldedAddress;
    
    console.log('Using coinPublicKey:', coinPublicKey);
    console.log('Using encryptionPublicKey:', encryptionPublicKey);
    
    if (!coinPublicKey || !encryptionPublicKey) {
      console.error('Missing wallet keys. Available properties:', walletAddresses);
      throw new Error('Wallet did not provide required public keys');
    }
    
    // The SDK expects bech32 encoded strings
    // Check if we already have bech32 format (starts with "mn_")
    const isBech32 = (s: string) => typeof s === 'string' && s.startsWith('mn_');
    
    // Get network from config - use the same network for both addresses and tx serialization
    const networkId = config.networkId || config.network || 'undeployed';
    // Use the same network ID for transaction serialization to avoid mismatch
    const serializationNetworkId = networkId;
    console.log('Network ID for addresses:', networkId);
    console.log('Network ID for tx serialization:', serializationNetworkId);
    
    // Convert hex to bech32 if needed using SDK utilities
    let coinPubKeyForSDK = coinPublicKey;
    let encPubKeyForSDK = encryptionPublicKey;
    
    if (!isBech32(coinPublicKey)) {
      console.log('Converting coinPublicKey from hex to bech32...');
      console.log('coinPublicKey type:', typeof coinPublicKey, 'value:', coinPublicKey);
      try {
        const coinPubKeyObj = ShieldedCoinPublicKey.fromHexString(coinPublicKey);
        console.log('coinPubKeyObj created:', coinPubKeyObj);
        // Use the codec's encode method directly
        const encoded = ShieldedCoinPublicKey.codec.encode(networkId, coinPubKeyObj);
        console.log('Encoded object:', encoded);
        coinPubKeyForSDK = encoded.asString();
        console.log('Converted coinPublicKey to bech32:', coinPubKeyForSDK);
      } catch (e: any) {
        console.error('Failed to convert coinPublicKey:', e.message, e.stack);
        // Keep original value - will likely fail later but with better error context
      }
    }
    
    if (!isBech32(encryptionPublicKey)) {
      console.log('Converting encryptionPublicKey from hex to bech32...');
      try {
        const encPubKeyObj = ShieldedEncryptionPublicKey.fromHexString(encryptionPublicKey);
        const encoded = ShieldedEncryptionPublicKey.codec.encode(networkId, encPubKeyObj);
        encPubKeyForSDK = encoded.asString();
        console.log('Converted encryptionPublicKey to bech32:', encPubKeyForSDK);
      } catch (e: any) {
        console.error('Failed to convert encryptionPublicKey:', e.message, e.stack);
      }
    }
    
    console.log('Final coinPubKeyForSDK:', coinPubKeyForSDK, 'type:', typeof coinPubKeyForSDK);
    console.log('Final encPubKeyForSDK:', encPubKeyForSDK, 'type:', typeof encPubKeyForSDK);
    
    // WalletProvider and MidnightProvider must be MERGED into one object
    // The SDK expects balanceTx and submitTx on walletProvider, not separate
    // The Lace wallet DApp connector API expects SERIALIZED (hex) transactions
    const walletAndMidnightProvider = {
      // SDK expects SYNCHRONOUS functions that return strings directly (NOT async!)
      getCoinPublicKey: () => {
        console.log('walletProvider.getCoinPublicKey() called, returning:', coinPubKeyForSDK);
        return coinPubKeyForSDK;
      },
      getEncryptionPublicKey: () => {
        console.log('walletProvider.getEncryptionPublicKey() called, returning:', encPubKeyForSDK);
        return encPubKeyForSDK;
      },
      // These must be on the same object
      // Wallet API expects hex string, SDK provides transaction object
      submitTx: async (tx: any) => {
        console.log('Submitting transaction, type:', typeof tx, tx);
        // Serialize transaction to hex for wallet API
        let txHex: string;
        if (typeof tx === 'string') {
          txHex = tx;
        } else if (tx && typeof tx.serialize === 'function') {
          const serialized = tx.serialize(serializationNetworkId);
          txHex = toHex(serialized);
        } else if (tx && tx.hash) {
          // If it's a finalized tx with hash, serialize appropriately
          const serialized = Transaction.serialize ? Transaction.serialize(tx, serializationNetworkId) : tx;
          txHex = typeof serialized === 'string' ? serialized : toHex(serialized);
        } else {
          console.error('Unknown transaction format for submitTx:', tx);
          throw new Error('Cannot serialize transaction for submission');
        }
        console.log('Submitting serialized tx (hex):', txHex.substring(0, 100) + '...');
        return walletAPI.submitTransaction(txHex);
      },
      balanceTx: async (tx: any, ttl?: Date) => {
        console.log('Balancing transaction, type:', typeof tx, tx);
        console.log('Transaction constructor:', tx?.constructor?.name);
        console.log('Has serialize method:', typeof tx?.serialize);
        
        // Try to serialize transaction to hex for wallet API
        let txHex: string;
        if (typeof tx === 'string') {
          txHex = tx;
        } else if (tx && typeof tx.serialize === 'function') {
          // Try both network IDs to see which one works
          console.log('Trying serialization with testnet...');
          const serialized = tx.serialize(serializationNetworkId);
          console.log('Raw serialized bytes (first 50):', Array.from(serialized.slice(0, 50)));
          txHex = toHex(serialized);
          console.log('Serialized tx for balancing (truncated):', txHex.substring(0, 200) + '...');
          console.log('Serialized tx length:', txHex.length, 'bytes:', serialized.length);
        } else {
          console.error('Unknown transaction format for balanceTx:', tx);
          throw new Error('Cannot serialize transaction for balancing');
        }
        
        // Call wallet API with hex string
        try {
          console.log('Calling walletAPI.balanceUnsealedTransaction with hex string...');
          const result = await walletAPI.balanceUnsealedTransaction(txHex);
          console.log('Balance result from wallet:', result);
          
          // Wallet returns { tx: string } - deserialize back to transaction object
          if (result && result.tx) {
            const balancedBytes = fromHex(result.tx);
            const balancedTx = Transaction.deserialize(balancedBytes, serializationNetworkId);
            console.log('Deserialized balanced transaction:', balancedTx);
            return balancedTx;
          }
          return result;
        } catch (walletError: any) {
          console.error('Wallet balanceUnsealedTransaction error:', walletError);
          console.error('Wallet error message:', walletError?.message);
          console.error('Wallet error code:', walletError?.code);
          console.error('Wallet error data:', walletError?.data);
          console.error('Full wallet error object:', JSON.stringify(walletError, null, 2));
          throw walletError;
        }
      },
    };

    this.providers = {
      privateStateProvider: createBrowserPrivateStateProvider(), 
      publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
      zkConfigProvider: keyMaterialProvider,
      proofProvider,
      walletProvider: walletAndMidnightProvider,
      midnightProvider: walletAndMidnightProvider, // Same object reference
    };

    this.diplomaCompiledContract = CompiledContract.make('diploma', Contract).pipe(
      CompiledContract.withVacantWitnesses
    );
    console.log('✅ MidnightDAppAPI initialized successfully');
  }

  async registerCredential(commitment: Uint8Array, holderAddress: Uint8Array): Promise<RegisterCredentialResult> {
    console.log('registerCredential called with:', {
      commitment: Array.from(commitment).map(b => b.toString(16).padStart(2, '0')).join(''),
      holderAddress: Array.from(holderAddress).map(b => b.toString(16).padStart(2, '0')).join(''),
    });
    
    try {
      // Step 1: Deploy the contract (no args - just initial private state)
      console.log('Step 1: Deploying contract...');
      const diplomaContract = await deployContract(this.providers, {
        compiledContract: this.diplomaCompiledContract,
        privateStateId: 'diplomaPrivateState',
        initialPrivateState: { credentialSecret: commitment },
      });
      console.log('Step 2: Contract deployed at:', diplomaContract.deployTxData.public.contractAddress);
      
      // Step 3: Call the register_credential circuit on the deployed contract
      console.log('Step 3: Calling register_credential circuit...');
      const finalizedTx = await diplomaContract.callTx.register_credential(commitment, holderAddress);
      console.log('Step 4: Transaction finalized:', finalizedTx);
      
      return {
          txHash: finalizedTx.public.txHash,
          contractAddress: diplomaContract.deployTxData.public.contractAddress
      };
    } catch (err: any) {
      // Extract actual error from Effect-TS FiberFailure
      let actualError = err;
      if (err?._id === 'FiberFailure' && err?.cause) {
        console.error('FiberFailure detected, extracting cause...');
        const cause = err.cause;
        if (cause?._tag === 'Fail' && cause?.failure) {
          actualError = cause.failure;
          console.error('Actual failure:', actualError);
        }
        // Try to get the full cause chain
        if (cause?.cause) {
          console.error('Nested cause:', cause.cause);
        }
      }
      console.error('registerCredential error:', actualError);
      console.error('Error message:', actualError?.message || actualError?.toString?.() || String(actualError));
      console.error('Error stack:', actualError?.stack || err?.stack);
      console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      throw actualError;
    }
  }

  async proveGraduationRecency(contractAddress: string, graduationYear: number, maxYearsAgo: number, secret: Uint8Array, holderAddress: Uint8Array) {
    const diplomaContract = await findDeployedContract(this.providers, {
      compiledContract: this.diplomaCompiledContract,
      contractAddress,
      privateStateId: 'diplomaPrivateState',
    });

    const currentYear = BigInt(new Date().getFullYear());
    const result = await diplomaContract.callTx.prove_graduation_recency(
        currentYear, 
        BigInt(graduationYear), 
        BigInt(maxYearsAgo), 
        secret, 
        holderAddress
    );
    return result.public;
  }

  async proveDegreeLevel(contractAddress: string, requiredLevel: number, holderLevel: number, secret: Uint8Array, holderAddress: Uint8Array) {
      const diplomaContract = await findDeployedContract(this.providers, {
          compiledContract: this.diplomaCompiledContract,
          contractAddress,
          privateStateId: 'diplomaPrivateState',
      });

      const result = await diplomaContract.callTx.prove_degree_level(
          BigInt(requiredLevel), 
          BigInt(holderLevel), 
          secret, 
          holderAddress
      );
      return result.public;
  }

  // Legacy alias for backwards compatibility
  async register(commitment: Uint8Array, walletAddress: Uint8Array) {
    return this.registerCredential(commitment, walletAddress);
  }
}
