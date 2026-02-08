import { Contract } from '../../contract/dist/managed/kyc/contract/index.js';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

export interface KYCPrivateState {
  kycSecret: Uint8Array;
}

export interface RegisterResult {
    txHash: string;
    contractAddress: string;
}

// Browser-safe Midnight API wrapper
export class MidnightDAppAPI {
  private kycCompiledContract: any;
  private providers: any;

  constructor() { }

  async initialize(walletAPI: any) {
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

    this.kycCompiledContract = CompiledContract.make('kyc', Contract);
  }

  async register(commitment: Uint8Array, walletAddress: Uint8Array): Promise<RegisterResult> {
    const kycContract = await deployContract(this.providers, {
      compiledContract: this.kycCompiledContract,
      privateStateId: 'kycPrivateState',
      initialPrivateState: { kycSecret: commitment },
      args: [commitment, walletAddress]
    });
    
    const finalizedTx = await kycContract.callTx.register(commitment, walletAddress);
    
    return {
        txHash: finalizedTx.public.txHash,
        contractAddress: kycContract.deployTxData.public.contractAddress
    };
  }

  async proveAge(contractAddress: string, birthYear: number, minAge: number, secret: Uint8Array, walletAddress: Uint8Array) {
    const kycContract = await findDeployedContract(this.providers, {
      compiledContract: this.kycCompiledContract,
      contractAddress,
      privateStateId: 'kycPrivateState',
    });

    const currentYear = BigInt(new Date().getFullYear());
    const result = await kycContract.callTx.prove_age_eligible(
        currentYear, 
        BigInt(birthYear), 
        BigInt(minAge), 
        secret, 
        walletAddress
    );
    return result.public;
  }

  async proveResidency(contractAddress: string, requiredCountry: number, userCountry: number, secret: Uint8Array, walletAddress: Uint8Array) {
      const kycContract = await findDeployedContract(this.providers, {
          compiledContract: this.kycCompiledContract,
          contractAddress,
          privateStateId: 'kycPrivateState',
      });

      const result = await kycContract.callTx.prove_residency(
          BigInt(requiredCountry), 
          BigInt(userCountry), 
          secret, 
          walletAddress
      );
      return result.public;
  }
}
