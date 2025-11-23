import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("AutoExitBot System", function () {

  async function deployFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockToken");
    const usdc = await MockToken.deploy("USDC", "USDC");
    const weth = await MockToken.deploy("WETH", "WETH");

    
    const MockUniswap = await ethers.getContractFactory("MockUniswap");
    const mockUniswap = await MockUniswap.deploy();

    
    const AutoExitBot = await ethers.getContractFactory("AutoExitBot");
    const bot = await AutoExitBot.deploy(mockUniswap.target, mockUniswap.target);

    
    await usdc.mint(owner.address, ethers.parseUnits("3000", 18));
    
    await weth.mint(mockUniswap.target, ethers.parseUnits("10", 18));

    return { bot, mockUniswap, usdc, weth, owner };
  }

  it("Should execute the full Buy-Dip-Exit lifecycle", async function () {
    const { bot, mockUniswap, usdc, weth, owner } = await loadFixture(deployFixture);

    
    console.log("1. Setting up position...");
    
    
    await usdc.approve(bot.target, ethers.parseUnits("3000", 18));

    
    await bot.mintRangeOrder({
      token0: usdc.target,
      token1: weth.target,
      fee: 3000,
      amountToBuy: ethers.parseUnits("3000", 18),
      lowerTick: 79700, 
      upperTick: 80000
    });

    
    const config = await bot.config();
    expect(config.isActive).to.be.true;
    expect(config.tokenId).to.equal(1);
    console.log(" Position Minted successfully.");


    
    await (mockUniswap as any).setTick(80500);
    
    const [upkeepNeeded1] = await bot.checkUpkeep("0x");
    expect(upkeepNeeded1).to.be.false;
    console.log(" Price is high. Bot stays idle.");


    
    console.log(" Simulating market crash below 2900...");
    
    await (mockUniswap as any).setTick(79000);

    const [upkeepNeeded2] = await bot.checkUpkeep("0x");
    expect(upkeepNeeded2).to.be.true;
    console.log(" Price dropped! Upkeep is now NEEDED.");


   
    console.log("Triggering Auto-Exit...");
    
    
    const balanceBefore = await weth.balanceOf(owner.address);
    console.log(" Balance Before:", ethers.formatUnits(balanceBefore, 18));

    
    await bot.performUpkeep("0x");

    
    const balanceAfter = await weth.balanceOf(owner.address);
    console.log(" Balance After: ", ethers.formatUnits(balanceAfter, 18));
    
    
    const profit = ethers.parseUnits("1", 18);
    expect(balanceAfter).to.equal(balanceBefore + profit);
    
    const configAfter = await bot.config();
    expect(configAfter.isActive).to.be.false;

    console.log(" Bot exited and sent 1 WETH profit to owner!");
  });
});