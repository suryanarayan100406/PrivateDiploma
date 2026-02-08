import { Diploma, type DiplomaPrivateState } from '@private-diploma/contract';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { ImpureCircuitId } from '@midnight-ntwrk/compact-js';

// PrivateDiploma types
export type DiplomaCircuits = ImpureCircuitId<Diploma.Contract<DiplomaPrivateState>>;
export const DiplomaPrivateStateId = 'diplomaPrivateState';
export type DiplomaProviders = MidnightProviders<DiplomaCircuits, typeof DiplomaPrivateStateId, DiplomaPrivateState>;
export type DiplomaContract = Diploma.Contract<DiplomaPrivateState>;
export type DeployedDiplomaContract = DeployedContract<DiplomaContract> | FoundContract<DiplomaContract>;
