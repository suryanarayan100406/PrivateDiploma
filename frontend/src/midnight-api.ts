// @ts-ignore - Dynamic import for contract
let Contract: any = null;
let CompiledContract: any = null;
let deployContract: any = null;
let findDeployedContract: any = null;
let indexerPublicDataProvider: any = null;
let levelPrivateStateProvider: any = null;

// Lazy load Midnight dependencies to prevent blank page on load errors
const loadMidnightDeps = async () => {
  if (!Contract) {
    try {
      const contractModule = await import('@contract/managed/diploma/contract/index.js');
      Contract = contractModule.Contract;
      
      const compactJs = await import('@midnight-ntwrk/compact-js');
      CompiledContract = compactJs.CompiledContract;
      
      const contracts = await import('@midnight-ntwrk/midnight-js-contracts');
      deployContract = contracts.deployContract;
      findDeployedContract = contracts.findDeployedContract;
      
      const indexer = await import('@midnight-ntwrk/midnight-js-indexer-public-data-provider');
      indexerPublicDataProvider = indexer.indexerPublicDataProvider;
      
      const privateState = await import('@midnight-ntwrk/midnight-js-level-private-state-provider');
      levelPrivateStateProvider = privateState.levelPrivateStateProvider;
    } catch (e) {
      console.warn('Midnight dependencies not available, running in demo mode', e);
    }
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
    // Load Midnight dependencies first
    await loadMidnightDeps();
    
    if (!Contract || !CompiledContract) {
      throw new Error('Midnight dependencies not available');
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
