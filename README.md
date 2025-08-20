# TradeNex

A decentralized e-commerce marketplace built on Web3 that addresses real-world issues like high intermediary fees, lack of transparency in transactions, counterfeit products, and centralized control by enabling peer-to-peer trading with built-in escrow, reputation systems, and community governance—all on-chain using the Stacks blockchain for Bitcoin-level security.

---

## Overview

TradeNex consists of four main smart contracts that together form a trustless, transparent, and user-empowered e-commerce ecosystem:

1. **Marketplace Token Contract** – Issues and manages the platform's utility token for transactions and incentives.
2. **Product Listing Contract** – Handles creation, listing, and sales of products (physical or digital) as NFTs or tokenized assets.
3. **Escrow and Payment Contract** – Ensures secure, automated payments and dispute handling through escrow mechanisms.
4. **Governance DAO Contract** – Allows token holders to vote on platform upgrades, fee structures, and dispute resolutions.

---

## Features

- **Peer-to-peer listings** without intermediaries, reducing fees by up to 90% compared to traditional platforms  
- **Tokenized products** for verifiable ownership and anti-counterfeit measures via NFTs  
- **Automated escrow** for safe transactions with release conditions based on delivery verification  
- **Reputation system** integrated with on-chain reviews and ratings  
- **DAO governance** for community-driven decisions on platform rules and improvements  
- **Cross-border payments** using the platform token, bypassing traditional banking hurdles  
- **Dispute resolution** through token-weighted voting to fairly handle conflicts  
- **Incentive rewards** for active buyers, sellers, and reviewers in platform tokens  

---

## Smart Contracts

### Marketplace Token Contract
- Mint, burn, and transfer platform utility tokens (e.g., NEX tokens)
- Staking mechanisms for governance participation and fee discounts
- Token supply management with anti-inflation controls

### Product Listing Contract
- Create and list products as NFTs or fungible tokens with metadata (description, price, images)
- Handle auctions, fixed-price sales, and transfers of ownership
- Integrate royalty fees for creators on resales

### Escrow and Payment Contract
- Lock funds in escrow during transactions until conditions (e.g., delivery confirmation via oracle) are met
- Automated refunds or releases based on buyer/seller agreements
- Dispute escalation to governance for unresolved issues

### Governance DAO Contract
- Token-weighted voting on proposals like fee changes or new features
- On-chain execution of approved proposals
- Quorum requirements and voting periods to ensure fair participation

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/tradenex.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract operates independently but integrates with others for a complete decentralized e-commerce experience. Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License

