import { Diploma, type DiplomaPrivateState } from '@private-diploma/contract';
import { Simulator, type CircuitContext, type Contract } from '@midnight-ntwrk/compact-runtime';

/**
 * PrivateDiploma Simulator - For testing credential verification circuits
 */
export class DiplomaSimulator {
  readonly contract: Contract<DiplomaPrivateState>;
  circuitContext: CircuitContext<DiplomaPrivateState>;

  constructor() {
    this.contract = Diploma.Contract.make();
    this.circuitContext = Simulator.createContext(this.contract, { credentialSecret: new Uint8Array(32) });
  }

  registerCredential(commitment: Uint8Array): void {
    const result = Simulator.run(this.contract.circuits.register_credential, this.circuitContext, [commitment]);
    this.circuitContext = result.context;
  }

  proveCredentialOwnership(secret: Uint8Array): void {
    const result = Simulator.run(this.contract.circuits.prove_credential_ownership, this.circuitContext, [secret]);
    this.circuitContext = result.context;
  }
}
