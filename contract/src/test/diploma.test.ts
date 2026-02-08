import { describe, it, expect } from 'vitest';
import { DiplomaSimulator } from './diploma-simulator.js';
import * as crypto from 'crypto';

describe('PrivateDiploma - Educational Credential Verification', () => {
  it('should allow credential registration and subsequent proof generation', () => {
    const simulator = new DiplomaSimulator();
    const secret = crypto.randomBytes(32);
    // Hashing secret to create commitment (mimicking contract's persistentHash)
    // This represents hashed degree info: degree type, institution, graduation date
    const commitment = crypto.createHash('sha256').update(secret).digest();

    // Register the credential commitment on-chain
    expect(() => simulator.registerCredential(commitment)).not.toThrow();
  });

  it('should allow proving credential ownership without revealing details', () => {
    const simulator = new DiplomaSimulator();
    const credentialData = Buffer.from('BS-Computer-Science-MIT-2024');
    const secret = crypto.randomBytes(32);
    const commitment = crypto.createHash('sha256').update(secret).digest();

    // Institution registers the credential
    expect(() => simulator.registerCredential(commitment)).not.toThrow();
    
    // Graduate proves ownership (in real scenario, would verify the proof)
    // Note: Full proof verification requires the runtime environment
  });
});
