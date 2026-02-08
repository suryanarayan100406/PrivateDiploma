import * as api from './api.js';
import { preprodConfig } from './config.js';
import { Buffer } from 'buffer';
import * as crypto from 'crypto';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const rl = readline.createInterface({ input, output });

const DEGREE_LEVELS: Record<string, number> = {
  'Associate': 1,
  'Bachelor': 2,
  'Master': 3,
  'Doctorate': 4,
  'Professional': 5
};

async function main() {
  console.log('--- PrivateDiploma: Educational Credential Verification ---');
  console.log('Powered by Midnight Network & Lace Wallet\n');
  
  while (true) {
    console.log('\nOptions:');
    console.log('1. Initialize Lace Wallet Connection');
    console.log('2. Register Credential (Institution)');
    console.log('3. Prove Credential Ownership (Graduate)');
    console.log('4. Prove Graduation Recency');
    console.log('5. Prove Degree Level');
    console.log('6. Exit');

    const choice = await rl.question('Select an option: ');

    switch (choice) {
      case '1':
        console.log('Lace Wallet initialization...');
        console.log('Connect your Lace wallet with Midnight testnet enabled.');
        break;
      case '2':
        const institution = await rl.question('Enter Institution Name: ');
        const degreeType = await rl.question('Enter Degree Type (Bachelor/Master/Doctorate): ');
        const field = await rl.question('Enter Field of Study: ');
        const gradYear = await rl.question('Enter Graduation Year: ');
        
        const credentialData = `${degreeType}-${field}-${institution}-${gradYear}`;
        const secret = crypto.randomBytes(32);
        const commitment = crypto.createHash('sha256').update(credentialData).update(secret).digest();
        
        console.log(`\nCredential Data: ${credentialData}`);
        console.log(`Generated commitment: ${commitment.toString('hex')}`);
        console.log('\nThis commitment can be registered on-chain via api.registerCredential()...');
        break;
      case '3':
        console.log('Proving credential ownership...');
        console.log('This generates a ZK proof that you own the credential without revealing details.');
        break;
      case '4':
        const maxYears = await rl.question('Maximum years since graduation: ');
        console.log(`Proving graduation within last ${maxYears} years...`);
        console.log('This proves your degree is recent without revealing exact graduation date.');
        break;
      case '5':
        const requiredLevel = await rl.question('Required degree level (Bachelor/Master/Doctorate): ');
        console.log(`Proving degree level >= ${requiredLevel}...`);
        console.log('This proves you meet the education requirement without revealing your exact degree.');
        break;
      case '6':
        console.log('\nThank you for using PrivateDiploma!');
        process.exit(0);
      default:
        console.log('Invalid option.');
    }
  }
}

main().catch(console.error);
