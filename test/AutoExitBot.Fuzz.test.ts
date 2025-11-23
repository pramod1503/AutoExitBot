import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import fc from "fast-check"; 

describe("AutoExitBot Fuzz Testing", function () {

  async function deployFixture() {
    const [owner] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockToken");
    const usdc = await MockToken.deploy("USDC", "USDC");
    const weth = await MockToken.deploy("WETH", "WETH");

    const MockUniswap = await ethers.getContractFactory("MockUniswap");
    const mockUniswap = await MockUniswap.deploy();

    const AutoExitBot = await ethers.getContractFactory("AutoExitBot");
    const bot = await AutoExitBot.deploy(mockUniswap.target, mockUniswap.target);

    await weth.mint(mockUniswap.target, ethers.parseUnits("1000000", 18));

    return { bot, mockUniswap, usdc, weth, owner };
  }

  it("Fuzz Test: Should handle random USDC amounts and ticks correctly", async function () {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 10_000_000 }), 
        fc.integer({ min: 50000, max: 80000 }),    
        fc.integer({ min: 80001, max: 90000 }),    
        async (amountNum, lowerTick, upperTick) => {
          
          
          const { bot, mockUniswap, usdc, weth, owner } = await loadFixture(deployFixture);
          
          
          const amountToBuy = ethers.parseUnits(amountNum.toString(), 6); 

          
          await usdc.mint(owner.address, amountToBuy);
          await usdc.approve(bot.target, amountToBuy);

          
          await bot.mintRangeOrder({
            token0: usdc.target,
            token1: weth.target,
            fee: 3000,
            amountToBuy: amountToBuy,
            lowerTick: lowerTick,
            upperTick: upperTick
          });

          
          const config = await bot.config();
          expect(config.isActive).to.be.true;
          expect(config.targetTick).to.equal(BigInt(lowerTick));

          
          const crashTick = lowerTick - 100; 
          await (mockUniswap as any).setTick(crashTick);

          
          const [upkeepNeeded] = await bot.checkUpkeep("0x");
          expect(upkeepNeeded).to.be.true;

          
          const balanceBefore = await weth.balanceOf(owner.address);
          await bot.performUpkeep("0x");
          const balanceAfter = await weth.balanceOf(owner.address);

          
          
          expect(balanceAfter).to.be.gt(balanceBefore);
          
          const configAfter = await bot.config();
          expect(configAfter.isActive).to.be.false;
        }
      ),
      { numRuns: 20 } 
    );
  });

  it("Fuzz Test: Should REVERT if Lower Tick >= Upper Tick", async function () {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 70000, max: 80000 }), 
        fc.integer({ min: 1000, max: 10000 }),  
        async (tickA, tickB) => {
          const { bot, usdc, weth, owner } = await loadFixture(deployFixture);
          const amount = ethers.parseUnits("1000", 6);
          await usdc.mint(owner.address, amount);
          await usdc.approve(bot.target, amount);

          
          
          const lower = tickA;
          const upper = tickA - tickB; 

          await expect(
             bot.mintRangeOrder({
              token0: usdc.target,
              token1: weth.target,
              fee: 3000,
              amountToBuy: amount,
              lowerTick: lower,
              upperTick: upper
            })
          ).to.be.revertedWithCustomError(bot, "InvalidTickRange");
        }
      ),
      { numRuns: 10 } 
    );
  });

});