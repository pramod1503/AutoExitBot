🦄 Uniswap V3 Auto-Exit Sniper Bot

📖 Project Overview

This is a DeFi Automation System built on Uniswap V3 and Chainlink Automation (Keepers).

It solves a critical problem for traders: "buying the dip" without needing to stay awake 24/7. The bot creates a concentrated liquidity position (Range Order) and automatically exits (withdraws to wallet) the moment the buy order is filled, preventing the "round-trip" loss that occurs if prices rebound while funds are still in the pool.

🎯 Key Features

Atomic Execution: Minting, transfers, and approvals are handled in a single transaction.

Gas Optimization: Implements viaIR optimization and struct packing to bypass EVM stack limits.

Security First: Protected by ReentrancyGuard, SafeERC20, and Ownable patterns.

Zero-Gas Monitoring: Uses Chainlink Automation to monitor price ticks off-chain, executing on-chain only when profitable.

🏗️ System Architecture

The system consists of three distinct phases managed by the Smart Contract.

Phase 1: The Setup (Minting)

The user deposits USDC into the bot. The bot interacts with the Uniswap NonfungiblePositionManager to mint a single-sided liquidity position (Range Order) and holds the NFT receipt custodially.

sequenceDiagram
    participant User as 👨‍💻 User
    participant Bot as 🤖 AutoExitBot
    participant Uni as 🦄 Uniswap V3

    User->>Bot: mintRangeOrder(3000 USDC)
    activate Bot
    Bot->>Uni: approve & mint()
    Uni-->>Bot: 🎫 NFT ID #123
    Bot->>Bot: Store State (Active = True)
    deactivate Bot


Phase 2: The Watchtower (Monitoring)

Chainlink Automation nodes continuously simulate the checkUpkeep function off-chain. This function queries the Uniswap V3 Pool slot0 to check the current tick.

Condition: Current Tick < Target Tick

Result: If true, triggers Phase 3.

Phase 3: The Exit (Execution)

Once triggered, the bot executes the exit strategy in one atomic transaction:

Burn: Calls decreaseLiquidity to remove 100% of position.

Collect: Calls collect to harvest the converted ETH + Fees.

Payout: Transfers all assets to the Owner's wallet using SafeTransfer.

🛠️ Technical Stack

Component

Technology

Purpose

Language

Solidity ^0.8.20

Smart Contract Logic

Framework

Hardhat + TypeScript

Development, Testing, Deployment

Core Integration

Uniswap V3 Periphery

Liquidity Management & Minting

Automation

Chainlink Keepers

Decentralized Trigger Mechanism

Testing

Chai, Ethers.js, Fast-Check

Unit Testing & Fuzz Testing

Optimization

viaIR Pipeline

Stack Too Deep resolution

⚡ Installation & Setup

1. Clone the Repository

git clone [https://github.com/pramod1503/AutoExitBot](https://github.com/pramod1503/AutoExitBot)
cd uniswap-auto-exit-bot


2. Install Dependencies

We use a specific set of versions to ensure compatibility between Hardhat v3 and Uniswap v3.

npm install


3. Compile Contracts

Compiles the Solidity code and generates TypeChain bindings.

npx hardhat compile


🧪 Testing

The project includes a robust testing suite using Mocks to simulate Mainnet conditions without forking.

Running Unit Tests

Simulates the full lifecycle: Mint -> Price Crash -> Auto Exit -> Profit Check.

npx hardhat test


Expected Output:

  AutoExitBot System
    1. Setting up position...
    ✅ Position Minted successfully.
    ✅ Price is high. Bot stays idle.
    📉 Simulating market crash...
    ✅ Price dropped! Upkeep is now NEEDED.
    🚀 Triggering Auto-Exit...
    ✅ Bot exited and sent profit to owner!
    



