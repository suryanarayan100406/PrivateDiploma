# PrivateDiploma

**Privacy-Preserving Educational Credential Verification on Midnight Network**

> Employers verify degrees and certifications without accessing full academic transcripts - powered by Zero-Knowledge Proofs.

![Midnight Network](https://img.shields.io/badge/Midnight-Network-purple)
![Compact](https://img.shields.io/badge/Compact-0.4.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## The Problem

Traditional credential verification is:
- **Slow**: Manual university verification takes days/weeks
- **Privacy-Invasive**: Employers see GPA, course details, disciplinary records
- **Fraud-Prone**: Diploma mills and fake certificates are rampant
- **Expensive**: Verification services charge per request

## Our Solution

PrivateDiploma uses **Zero-Knowledge Proofs** on the **Midnight Network** to:

| Feature | Description |
|---------|-------------|
| **Privacy First** | Employers verify credentials WITHOUT seeing sensitive data |
| **Instant** | Verification in seconds, not days |
| **Tamper-Proof** | Credentials anchored on blockchain |
| **Cost-Effective** | No intermediary verification fees |

---

## Architecture

`
+---------------------+     +---------------------+     +---------------------+
|    UNIVERSITY       |     |   MIDNIGHT NETWORK  |     |     EMPLOYER        |
|  (Issue Credential) |---->|   (ZK Verification) |<----|  (Verify Without    |
|                     |     |                     |     |   Seeing Details)   |
+---------------------+     +---------------------+     +---------------------+
                                      ^
                                      |
                            +---------+---------+
                            |    LACE WALLET    |
                            |    (Graduate)     |
                            +-------------------+
`

### Smart Contract Circuits (ZK Proofs)

| Circuit | Purpose | What is Proven | What is Hidden |
|---------|---------|---------------|---------------|
| `register_credential` | Store credential commitment | Valid credential exists | All details |
| `prove_credential_ownership` | Prove you own the credential | Ownership | Credential contents |
| `prove_graduation_recency` | Graduated within X years | Time constraint met | Exact graduation date |
| `prove_degree_level` | Has Bachelors or higher | Minimum degree level | Actual degree |
| `prove_accredited_institution` | From accredited university | Institution validity | Institution name |
| `verify_credential` | Full credential check | Credential validity | Everything |

---

## Quick Start

### Prerequisites

- **Node.js** v22+
- **Docker** (for Midnight services)
- **Lace Wallet** browser extension with Midnight testnet enabled
- **Compact Compiler** v0.4.0+

### 1. Clone and Install

`ash
git clone https://github.com/suryanarayan100406/PrivateDiploma.git
cd PrivateDiploma

# Install all dependencies
npm install
`

### 2. Start Midnight Services

`ash
docker-compose up -d
`

This starts:
| Service | Port | Purpose |
|---------|------|---------|
| `midnight-node` | 9944 | Local Midnight blockchain |
| `indexer` | 8088 | Transaction indexing |
| `proof-server` | 6300 | ZK proof generation |

### 3. Compile and Build Contract

`ash
cd contract
compact compile src/diploma.compact src/managed/diploma
npm run build
cd ..
`

### 4. Run Frontend

`ash
cd frontend
npm install
npm run dev
`

Open **http://localhost:5173** in your browser.

---

## Usage

### For Graduates

1. **Connect Lace Wallet** (Midnight testnet)
2. **Upload Credential** (diploma image/PDF)
3. **Fill Details**: Institution, Degree Type, Field, Graduation Year
4. **Register on Chain** - receive a credential hash

### For Employers

1. **Connect Lace Wallet**
2. **Enter Credential Hash** from candidate
3. **Choose Verification Type**:
   - **Graduation Recency**: Graduated within last 5 years?
   - **Degree Level**: Has at least a Bachelors?
   - **Institution Check**: From accredited university?
4. **Get Instant Proof** - YES/NO without seeing any details

---

## Project Structure

`
PrivateDiploma/
 contract/                 # Midnight Smart Contract
    src/
       diploma.compact   # ZK circuits (Compact language)
       witnesses.ts      # Private state types
       managed/          # Compiled contract output
    package.json

 frontend/                 # React + Vite UI
    src/
       App.tsx           # Main credential verification UI
       midnight-api.ts   # Midnight SDK wrapper
       index.css         # Tailwind CSS styles
    package.json

 cli/                      # Developer CLI tool
    src/
        index.ts          # CLI commands
        api.ts            # Backend API

 docker-compose.yml        # Midnight services
 README.md
`

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| **Blockchain** | Midnight Network (Privacy L1) |
| **Smart Contract** | Compact (ZK circuit language) |
| **ZK Proofs** | Plonk-based SNARKs |
| **Frontend** | React 18 + TypeScript + Tailwind CSS 4 |
| **Wallet** | Lace Wallet (Midnight testnet) |
| **Build** | Vite + WASM plugins |

---

## Testing

`ash
# Run contract tests
cd contract
npm test

# Type check
npm run typecheck
`

---

## Use Cases

### Universities and Institutions
- Issue tamper-proof digital credentials
- Reduce administrative burden for verification requests
- FERPA/GDPR compliant by design

### Graduates  
- Own your credentials in your wallet
- Share verifiable proofs without exposing sensitive data
- Instant verification anywhere in the world

### Employers
- Verify credentials in seconds, not days
- Eliminate diploma fraud risks
- No liability for storing sensitive academic data

---

## Midnight Network

PrivateDiploma is built on the [Midnight Network](https://midnight.network/) - a data protection blockchain that uses Zero-Knowledge technology to keep sensitive information private while still allowing verification.

**Key Benefits:**
- Data never leaves your control
- Programmable privacy with Compact language
- Interoperable with other blockchains
- Regulatory compliant (GDPR, CCPA, FERPA)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Lace Wallet not connecting | Enable Midnight testnet in Lace settings |
| Compilation errors | Ensure `compact --version` shows 0.4.0+ |
| Port conflict | Vite auto-selects next available port |
| Docker services down | Run `docker-compose up -d` |
| Transaction fails | Ensure wallet has tDUST tokens |

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## License

MIT License - Built for the Midnight ecosystem.

---

## Acknowledgments

- [Midnight Network](https://midnight.network/) - Privacy blockchain infrastructure
- [Lace Wallet](https://www.lace.io/) - Midnight-compatible wallet
- [IOG](https://iohk.io/) - Blockchain research and development

---

**Verify credentials. Protect privacy. Trust the proof.**
