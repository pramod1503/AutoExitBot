// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interface/IUniswap.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockUniswap {
    
    int24 public currentTick;
    function setTick(int24 _tick) external { currentTick = _tick; }

    function slot0() external view returns (uint160, int24, uint16, uint16, uint16, uint8, bool) {
        return (0, currentTick, 0, 0, 0, 0, true);
    }

    function getPool(address, address, uint24) external view returns (address) {
        return address(this);
    }

    
    struct MockPosition {
        uint128 liquidity;
        address token0;
        address token1;
    }
    mapping(uint256 => MockPosition) public mockPositions;
    uint256 public nextId = 1;

    function mint(INonfungiblePositionManager.MintParams calldata params) external returns (
        uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1
    ) {
        IERC20(params.token0).transferFrom(msg.sender, address(this), params.amount0Desired);
        
        tokenId = nextId++;
        liquidity = 1000;
        
        mockPositions[tokenId] = MockPosition({
            liquidity: liquidity,
            token0: params.token0,
            token1: params.token1
        });

        return (tokenId, liquidity, params.amount0Desired, 0);
    }

    function decreaseLiquidity(INonfungiblePositionManager.DecreaseLiquidityParams calldata) external pure returns (uint256, uint256) {
        return (0, 0);
    }

    function collect(INonfungiblePositionManager.CollectParams calldata params) external returns (
        uint256 amount0,
        uint256 amount1
    ) {
        amount0 = 0;
        amount1 = 1 ether; 

        address token1 = mockPositions[params.tokenId].token1;
        
        IERC20(token1).transfer(params.recipient, amount1);
    }

    function positions(uint256 tokenId) external view returns (
        uint96 nonce, address operator, address token0, address token1, uint24 fee, 
        int24 tickLower, int24 tickUpper, uint128 liquidity, 
        uint256 feeGrowth0, uint256 feeGrowth1, uint128 tokensOwed0, uint128 tokensOwed1
    ) {
        MockPosition memory pos = mockPositions[tokenId];
        return (
            0, address(0), 
            pos.token0, 
            pos.token1, 
            3000, 0, 0, 
            pos.liquidity, 
            0, 0, 0, 0
        );
    }
}