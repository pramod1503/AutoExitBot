import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20", // Use this version for everything
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // <--- 🟢 CRITICAL: This fixes "Stack Too Deep"
    },
  },
  networks: {
    hardhat: {
      forking: {
        // Replace with your real URL if you have one, or leave as is
        url: "https://eth-mainnet.g.alchemy.com/v2/demo", 
        enabled: false,
      },
    },
    // You can add sepolia back later when you are ready to deploy
  },
};

export default config;