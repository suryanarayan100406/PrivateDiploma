// Midnight SDK imports - loaded dynamically to prevent crashes
let Contract: any = null;
let CompiledContract: any = null;
let deployContract: any = null;
let findDeployedContract: any = null;
let indexerPublicDataProvider: any = null;
let levelPrivateStateProvider: any = null;
let midnightLoaded = false;
let loadError: any = null;

// Try to load Midnight dependencies
const tryLoadMidnight = async () => {
  if (midnightLoaded) return true;
  if (loadError) return false;
  
  try {
    // Load each module separately to identify which one fails
    console.log('Loading contract module...');
    const contractMod = await import('@contract/managed/diploma/contract/index.js');
    Contract = contractMod.Contract;
    
    console.log('Loading compact-js...');
    const compactMod = await import('@midnight-ntwrk/compact-js');
    CompiledContract = compactMod.CompiledContract;
    
    console.log('Loading midnight-js-contracts...');
    const contractsMod = await import('@midnight-ntwrk/midnight-js-contracts');
    deployContract = contractsMod.deployContract;
    findDeployedContract = contractsMod.findDeployedContract;
    
    console.log('Loading indexer provider...');
    const indexerMod = await import('@midnight-ntwrk/midnight-js-indexer-public-data-provider');
    indexerPublicDataProvider = indexerMod.indexerPublicDataProvider;
    
    console.log('Loading private state provider...');
    const privateMod = await import('@midnight-ntwrk/midnight-js-level-private-state-provider');
    levelPrivateStateProvider = privateMod.levelPrivateStateProvider;
    
    midnightLoaded = true;
    console.log('All Midnight SDK modules loaded successfully');
    return true;
  } catch (e) {
    loadError = e;
    console.error('Midnight SDK load error:', e);
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

  constructor() { }

  async initialize(walletAPI: any) {
    // Load Midnight SDK
    const loaded = await tryLoadMidnight();
    if (!loaded) {
      throw new Error('Midnight SDK not available - ensure all dependencies are installed');
    }
    
    const config = await walletAPI.getConfiguration();
    
    // ZK Resources fetcher
    const fetchResource = async (path: string) => {
      const resp = await fetch(path);
      if (!resp.ok) throw new Error(`Failed to fetch ZK resource: ${path}`);
      const ab = await resp.arrayBuffer();
      return new Uint8Array(ab);
    };

    const keyMaterialProvider = {
      getZKIR: async (c: string) => fetchResource(`/zkir/${c}.zkir`),
      getProverKey: async (c: string) => fetchResource(`/keys/${c}.prover`),
      getVerifierKey: async (c: string) => fetchResource(`/keys/${c}.verifier`),
    };

    this.providers = {
      privateStateProvider: levelPrivateStateProvider({}), 
      publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
      zkConfigProvider: keyMaterialProvider,
      proofProvider: await walletAPI.getProvingProvider(keyMaterialProvider),
      walletProvider: {
        getCoinPublicKey: async () => (await walletAPI.getShieldedAddresses()).shieldedCoinPublicKey,
        getEncryptionPublicKey: async () => (await walletAPI.getShieldedAddresses()).shieldedEncryptionPublicKey,
      },
      midnightProvider: {
          submitTx: async (tx: any) => walletAPI.submitTransaction(tx),
          balanceTx: async (tx: any) => walletAPI.balanceUnsealedTransaction(tx),
      }
    };

    this.diplomaCompiledContract = CompiledContract.make('diploma', Contract);
  }

  async registerCredential(commitment: Uint8Array, holderAddress: Uint8Array): Promise<RegisterCredentialResult> {
    const diplomaContract = await deployContract(this.providers, {
      compiledContract: this.diplomaCompiledContract,
      privateStateId: 'diplomaPrivateState',
      initialPrivateState: { credentialSecret: commitment },
      args: [commitment, holderAddress]
    });
    
    const finalizedTx = await diplomaContract.callTx.register_credential(commitment, holderAddress);
    
    return {
        txHash: finalizedTx.public.txHash,
        contractAddress: diplomaContract.deployTxData.public.contractAddress
    };
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
