import { ethers } from "hardhat";

async function main() {
    console.log("Starting deployment...");

    const NONFUNGIBLE_POSITION_MANAGER = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
    const UNISWAP_V3_FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

    const[deployer] = await ethers.getSigners();
    console.log("Deploying with account", deployer.address);

    const MockToken = await ethers.getContractFactory("MockToken");
    const usdc = await MockToken.deploy("Fake USDC", "fusdc");
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();
    console.log("Mock USDC deployed to :", usdcAddress);

    const AutoExitBOt = await ethers.getContractFactory("AutoExitBot");
    const bot = await AutoExitBOt.deploy(
        NONFUNGIBLE_POSITION_MANAGER,
        UNISWAP_V3_FACTORY
    );

    await bot.waitForDeployment();
    const botAddress = await bot.getAddress();

    console.log("AutoExitBot deployed successfully to:", botAddress);
    console.log(`npx hardhat verify --network sepolia ${botAddress} ${NONFUNGIBLE_POSITION_MANAGER} ${UNISWAP_V3_FACTORY}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});