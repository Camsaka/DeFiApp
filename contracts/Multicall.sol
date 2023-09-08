// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

//The standard ABI coder does not allow arrays of dynamic types, structs or nested variables between the Solidity contract and the dApp.
//The ABI v2 coder; which allows structs, nested and dynamic variables to be passed into functions, returned from functions and emitted by events.
//Note: Do not use experimental features on live deployments !!
// pragma experimental ABIEncoderV2;

//deploy on sepolia at 0x549f46Df1c8877D2626baB75ca4c377ECaaDcfe2
//deploy on goerli at 0x6Ac6BEc8D447e07772eb50b835c886065210bBEe

interface IERC20 {
    function transfer(address _to, uint256 amount) external returns (bool);
}

contract Multicall {
    //owner of contract, prefer to import Ownable.sol of openZeppelin
    address private owner;

    //structure call
    struct Call {
        address target;
        bytes callData;
        uint256 ethtosell;
        uint256 gaslimit;
    }

    //set owner, again prefer to use Ownable.sol of openZeppelin

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You are not the owner of the contract");
        _;
    }

    //multicall returns
    //       blockNumber
    //       returnData : [calls results]
    //       gasUsed : [gas used for each call]
    //       if calls fails return 0x00

    function aggregate(
        Call[] calldata calls
    )
        public
        onlyOwner
        returns (
            uint256 blockNumber,
            bytes[] memory returnData,
            uint256[] memory gasUsed
        )
    {
        //solidity object represent the current block
        blockNumber = block.number;
        //we must declared the length of the array
        returnData = new bytes[](calls.length);
        gasUsed = new uint256[](calls.length);
        //solidity function return gas left
        uint256 startGas = gasleft();
        bytes memory ris = hex"00";

        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call{
                value: calls[i].ethtosell,
                gas: calls[i].gaslimit
            }(calls[i].callData);
            if (!success) {
                ret = ris;
            }
            returnData[i] = ret;
            gasUsed[i] = startGas - gasleft();
            startGas = gasleft();
        }
    }

    //helpers
    function getEthBalance(address addr) public view returns (uint256 balance) {
        return addr.balance;
    }

    function getBlockHash(
        uint256 blocknb
    ) public view returns (bytes32 blockHash) {
        return blockhash(blocknb);
    }

    function getLastBlockHash() public view returns (bytes32 lastBlockHash) {
        return blockhash(block.number - 1);
    }

    function getCurrentBlockTimestamp()
        public
        view
        returns (uint256 currentTimestamp)
    {
        return block.timestamp;
    }

    function getCurrentBlockDifficulty() public view returns (uint256 diff) {
        return block.difficulty;
    }

    function getCurrentGasLimit() public view returns (uint256 limitGas) {
        return block.gaslimit;
    }

    function getCurrentBlockCoinbase()
        public
        view
        returns (address minerAddress)
    {
        return block.coinbase;
    }

    //allow the contract to receive funds
    //see openzeppelin acces control
    receive() external payable {}

    //withdraw only eth
    function rescueEth(uint256 amount) external onlyOwner {
        payable(msg.sender).transfer(amount);
    }

    //withdraw other token of the contract
    function withdraw(
        address _tokenContract,
        uint256 _amount
    ) external onlyOwner {
        IERC20 tokenContract = IERC20(_tokenContract);
        tokenContract.transfer(msg.sender, _amount);
    }
}
