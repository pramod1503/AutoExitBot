// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./interface/IUniswap.sol"; 
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol"; 
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AutoExitBot is IERC721Receiver, AutomationCompatibleInterface, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error OnlyOwnerCanMint();
    error UpkeepNotNeeded();
    error InvalidTickRange();
    error ZeroAmount();

    INonfungiblePositionManager public immutable manager;
    IUniswapV3Factory public immutable factory;

    struct PositionConfig {
        uint256 tokenId;
        int24 targetTick;
        address token0;
        address token1;
        uint24 fee;
        bool isActive;
    }
    PositionConfig public config;

    struct MintSettings {
        address token0;
        address token1;
        uint24 fee;
        uint256 amountToBuy;
        int24 lowerTick;
        int24 upperTick;
    }

    constructor(address _manager, address _factory) Ownable(msg.sender) {
        manager = INonfungiblePositionManager(_manager);
        factory = IUniswapV3Factory(_factory);
    }

    function mintRangeOrder(MintSettings calldata settings) external onlyOwner nonReentrant {
        if (settings.amountToBuy == 0) revert ZeroAmount();
        if (settings.lowerTick >= settings.upperTick) revert InvalidTickRange();

        // 1. Transfers (Standard)
        IERC20(settings.token0).safeTransferFrom(msg.sender, address(this), settings.amountToBuy);
        IERC20(settings.token0).forceApprove(address(manager), settings.amountToBuy);

        uint256 tokenId;

        
        {
            INonfungiblePositionManager.MintParams memory params = 
                INonfungiblePositionManager.MintParams({
                    token0: settings.token0,
                    token1: settings.token1,
                    fee: settings.fee,
                    tickLower: settings.lowerTick,
                    tickUpper: settings.upperTick,
                    amount0Desired: settings.amountToBuy,
                    amount1Desired: 0,
                    amount0Min: 0,
                    amount1Min: 0,
                    recipient: address(this),
                    deadline: block.timestamp
                });
            
            
            (tokenId, , , ) = manager.mint(params);
        } 
        

        
        config = PositionConfig({
            tokenId: tokenId,
            targetTick: settings.lowerTick,
            token0: settings.token0,
            token1: settings.token1,
            fee: settings.fee,
            isActive: true
        });
    }

    
    function checkUpkeep(bytes calldata /* checkData */) 
        external view override 
        returns (bool upkeepNeeded, bytes memory /* performData */) 
    {
        if (!config.isActive) return (false, "");
        address poolAddress = _getPool(config.token0, config.token1, config.fee);
        (, int24 currentTick, , , , , ) = IUniswapV3Pool(poolAddress).slot0();
        upkeepNeeded = (currentTick < config.targetTick);
    }

    
    function performUpkeep(bytes calldata /* performData */) external override nonReentrant {
        address poolAddress = _getPool(config.token0, config.token1, config.fee);
        (, int24 currentTick, , , , , ) = IUniswapV3Pool(poolAddress).slot0();
        
        if (!config.isActive || currentTick >= config.targetTick) {
            revert UpkeepNotNeeded();
        }

        
        uint128 liquidity = _getLiquidity(config.tokenId);

        
        {
            INonfungiblePositionManager.DecreaseLiquidityParams memory params = 
                INonfungiblePositionManager.DecreaseLiquidityParams({
                    tokenId: config.tokenId,
                    liquidity: liquidity,
                    amount0Min: 0,
                    amount1Min: 0,
                    deadline: block.timestamp
                });
            manager.decreaseLiquidity(params);
        }

        uint256 amount0;
        uint256 amount1;
        {
            INonfungiblePositionManager.CollectParams memory params = 
                INonfungiblePositionManager.CollectParams({
                    tokenId: config.tokenId,
                    recipient: address(this),
                    amount0Max: type(uint128).max,
                    amount1Max: type(uint128).max
                });
            (amount0, amount1) = manager.collect(params);
        }

        if (amount0 > 0) IERC20(config.token0).safeTransfer(owner(), amount0);
        if (amount1 > 0) IERC20(config.token1).safeTransfer(owner(), amount1);

        config.isActive = false;
    }

    function _getLiquidity(uint256 _tokenId) internal view returns (uint128) {
        ( , , , , , , , uint128 liquidity, , , , ) = manager.positions(_tokenId);
        return liquidity;
    }

    function _getPool(address tokenA, address tokenB, uint24 fee) internal view returns (address) {
        return IUniswapV3Factory(factory).getPool(tokenA, tokenB, fee);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}