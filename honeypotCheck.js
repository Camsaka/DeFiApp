
const Web3 = require('web3')
require('dotenv').config()

const PUB_KEY = process.env.PUB_KEY
const PRIV_KEY = process.env.PRIV_KEY

const INFURA_API_KEY = process.env.INFURA_API_KEY
var web3 = new Web3(`${INFURA_GOERLI_URL}`)

const WETHAddress = '0x0B1ba0af832d7C05fD64161E0Db78E85978E8082'; // mainTokenAddress
const routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const multicallAddress = '0x6Ac6BEc8D447e07772eb50b835c886065210bBEe'
const mainTokentoSell = '0.0035';
const maxgas = 2000000;
const minMain = 0;

const routerAbi = []
const tokenAbi = []
const multicallAbi = []

// Number of tokens with fixed decimals (return a string)
function setDecimals(number, decimals) {
   number = number.toString();
   var numberAbs = number.split('.')[0];
   var numberDecimals = number.split('.')[1] ? number.split('.')[1] : '';
   while (numberDecimals.length < decimals) {
     numberDecimals += '0';
   }
   return numberAbs + numberDecimals;
}

    

// Honeypot test
async function testHoneypot(web3, tokenAddress, mainTokenAddress, routerAddress, multicallAddress, mainTokentoSell, maxgas, minMain) {
    return new Promise(async (resolve) => {
        try {
            // Create contracts
            var mainTokencontract = new web3.eth.Contract(tokenAbi, mainTokenAddress);
            var tokenContract = new web3.eth.Contract(tokenAbi, tokenAddress);
            var routerContract = new web3.eth.Contract(routerAbi, routerAddress);
            var multicallContract = new web3.eth.Contract(multicallAbi, multicallAddress, { from: PUB_KEY });
      
            // Read decimals and symbols
            var mainTokenDecimals = await mainTokencontract.methods.decimals().call();
            var mainTokensymbol = await mainTokencontract.methods.symbol().call();
            var tokenSymbol = await tokenContract.methods.symbol().call();
            var tokenDecimals = await tokenContract.methods.decimals().call();
      
            // For swaps, 20 minutes from now in time
            var timeStamp = web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 20);
      
            // Fixed value of MainTokens to sell
            var mainTokentoSellfixed = setDecimals(mainTokentoSell, mainTokenDecimals);
      
            // Approve to sell the MainToken in the Dex call
            var approveMainToken = mainTokencontract.methods.approve(routerAddress, '115792089237316195423570985008687907853269984665640564039457584007913129639935') 
            var approveMainTokenABI = approveMainToken.encodeABI();
      
            // Swap MainToken to Token call
            var swapMainforTokens = routerContract.methods.swapExactTokensForTokens(mainTokentoSellfixed, 0, [mainTokenAddress, tokenAddress], multicallAddress, timeStamp);
            var swapMainforTokensABI = swapMainforTokens.encodeABI();
      
            var calls = [
              { target: mainTokenAddress, callData: approveMainTokenABI, ethtosell: 0, gastouse: maxgas }, // Approve MainToken sell
              { target: routerAddress, callData: swapMainforTokensABI, ethtosell: 0, gastouse: maxgas }, // MainToken -> Token
            ];
      
            // Before running the main multicall
            // Run another multicall that return the number of Tokens expected to receive from the swap (liquidity check also...)
            // We will try to sell half of the expected tokens
            var tokensToSell = null;
            var tokensToSellfixed = null;
            var result = await multicallContract.methods
              .aggregate(calls)
              .call()
              .catch((err) => console.log("multicall error:",err));
      
            // If error it means there is not enough liquidity
            var error = false;
            if (result.returnData[0] != '0x00' && result.returnData[1] != '0x00') {
              var receivedTokens = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[1]).amounts[1] * 10 ** -tokenDecimals;
      
              // We will try to sell half of the Tokens
              var fixd = tokenDecimals;
              if (fixd > 8) fixd = 8;
              tokensToSell = parseFloat(receivedTokens / 2).toFixed(fixd);
              tokensToSellfixed = setDecimals(tokensToSell, tokenDecimals);
            } else {
              error = true;
            }
      
            // Honeypot check variable
            var honeypot = false;
            if (!error) {
              // For checking if some problems and extra messages
              var problem = false;
              var extra = null;
      
              // Approve to sell the MainToken in the Dex call
              var approveMainToken = mainTokencontract.methods.approve(routerAddress, '115792089237316195423570985008687907853269984665640564039457584007913129639935');
              var approveMainTokenABI = approveMainToken.encodeABI();
      
              // Swap MainToken to Token call
              var swapMainforTokens = routerContract.methods.swapExactTokensForTokens(mainTokentoSellfixed, 0, [mainTokenAddress, tokenAddress], multicallAddress, timeStamp);
              var swapMainforTokensABI = swapMainforTokens.encodeABI();
      
              // Approve to sell the Token in the Dex call
              var approveToken = tokenContract.methods.approve(routerAddress, '115792089237316195423570985008687907853269984665640564039457584007913129639935');
              var approveTokenABI = approveToken.encodeABI();
      
              // Swap Token to MainToken call
              var swapTokensforMain = routerContract.methods.swapExactTokensForTokens(tokensToSellfixed, 0, [tokenAddress, mainTokenAddress], multicallAddress, timeStamp);
              var swapTokensforMainABI = swapTokensforMain.encodeABI();
      
              // Swap Token to MainToken call if the previous one fails
              var swapTokensforMainFees = routerContract.methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                tokensToSellfixed,
                0,
                [tokenAddress, mainTokenAddress],
                multicallAddress,
                timeStamp
              );
              var swapTokensforMainFeesABI = swapTokensforMainFees.encodeABI();
      
              // MainToken Balance call
              var mainTokenBalance = mainTokencontract.methods.balanceOf(multicallAddress);
              var mainTokenBalanceABI = mainTokenBalance.encodeABI();
      
              // Token Balance call
              var tokenBalance = tokenContract.methods.balanceOf(multicallAddress);
              var tokenBalanceABI = tokenBalance.encodeABI();
      
              // Expected MainToken from the Token to MainToken swap call
              var amountOut = routerContract.methods.getAmountsOut(tokensToSellfixed, [tokenAddress, mainTokenAddress]);
              var amountOutABI = amountOut.encodeABI();
      
              // Initial price in MainToken of 1 Token, for calculating price impact
              var amountOutAsk = routerContract.methods.getAmountsOut(setDecimals(1, tokenDecimals), [tokenAddress, mainTokenAddress]);
              var amountOutAskABI = amountOutAsk.encodeABI();
              var initialPrice = 0;
              var finalPrice = 0;
              var priceImpact = 0;
              try {
                initialPrice = await amountOutAsk.call();
                initialPrice = initialPrice[1];
              } catch (err) {}
      
              // Check if Token has Max Transaction amount
              var maxTokenTransaction = null;
              var maxTokenTransactionMain = null;
              try {
                maxTokenTransaction = await tokenContract.methods._maxTxAmount().call();
                maxTokenTransactionMain = await routerContract.methods.getAmountsOut(maxTokenTransaction, [tokenAddress, mainTokenAddress]).call();
                maxTokenTransactionMain = parseFloat(maxTokenTransactionMain[1] * 10 ** -mainTokenDecimals).toFixed(4);
                maxTokenTransaction = maxTokenTransaction * 10 ** -tokenDecimals;
              } catch (err) {}
      
              // Calls to run in the multicall
              var calls = [
                { target: mainTokenAddress, callData: approveMainTokenABI, ethtosell: 0, gastouse: maxgas }, // Approve MainToken sell
                { target: routerAddress, callData: swapMainforTokensABI, ethtosell: 0, gastouse: maxgas }, // MainToken -> Token
                { target: tokenAddress, callData: tokenBalanceABI, ethtosell: 0, gastouse: maxgas }, // Token balance
                { target: tokenAddress, callData: approveTokenABI, ethtosell: 0, gastouse: maxgas }, // Approve Token sell
                { target: routerAddress, callData: swapTokensforMainABI, ethtosell: 0, gastouse: maxgas }, // Token -> MainToken
                { target: mainTokenAddress, callData: mainTokenBalanceABI, ethtosell: 0, gastouse: maxgas }, // MainToken Balance
                { target: routerAddress, callData: amountOutABI, ethtosell: 0, gastouse: maxgas }, // Expected MainToken from the Token to MainToken swap
                { target: routerAddress, callData: swapTokensforMainFeesABI, ethtosell: 0, gastouse: maxgas }, // Token -> MainToken
                { target: mainTokenAddress, callData: mainTokenBalanceABI, ethtosell: 0, gastouse: maxgas }, // MainToken Balance
                { target: routerAddress, callData: amountOutAskABI, ethtosell: 0, gastouse: maxgas }, // Final price of the Token
              ];
      
              // Run the multicall
              var result = await multicallContract.methods
                .aggregate(calls)
                .call()
                .catch((err) => console.log(err));
      
              // Variables useful for calculating fees
              var output = 0; // Expected Tokens
              var realOutput = 0; // Obtained Tokens
              var expected = 0; // Expected MainTokens
              var obtained = 0; // Obtained MainTokens
              var buyGas = 0;
              var sellGas = 0;
      
              // Simulate the steps
              if (result.returnData[1] != '0x00') {
                output = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[1]).amounts[1] * 10 ** -tokenDecimals;
                buyGas = result.gasUsed[1];
              }
              if (result.returnData[2] != '0x00') {
                realOutput = web3.eth.abi.decodeLog([{ internalType: 'uint256', name: '', type: 'uint256' }], result.returnData[2])[0] * 10 ** -tokenDecimals;
              }
              if (result.returnData[4] != '0x00') {
                obtained = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[4]).amounts[1] * 10 ** -mainTokenDecimals;
                sellGas = result.gasUsed[4];
              } else {
                if (result.returnData[7] != '0x00') {
                  obtained = (result.returnData[8] - result.returnData[5]) * 10 ** -mainTokenDecimals;
                  sellGas = result.gasUsed[7];
                } else {
                  // If so this is honeypot!
                  honeypot = true;
                  problem = true;
                }
              }
              if (result.returnData[6] != '0x00') {
                expected = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[6]).amounts[1] * 10 ** -mainTokenDecimals;
              }
              if (result.returnData[9] != '0x00') {
                finalPrice = web3.eth.abi.decodeLog([{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }], result.returnData[9]).amounts[1];
                priceImpact = parseFloat(((finalPrice - initialPrice) / initialPrice) * 100).toFixed(1);
                if (priceImpact > 2) {
                  problem = true;
                  extra = 'Price change after the swaps is ' + priceImpact + '%, which is really high! (Too high percentages can cause false positives)';
                }
              }
      
              // Calculate the fees
              var buyTax = ((realOutput - output) / output) * -100;
              var sellTax = ((obtained - expected) / expected) * -100;
              if (buyTax < 0.0) buyTax = 0.0;
              if (sellTax < 0.0) sellTax = 0.0;
              buyTax = parseFloat(buyTax).toFixed(1);
              sellTax = parseFloat(sellTax).toFixed(1);
              if (buyTax > 10 || sellTax > 10) {
                problem = true;
              }
              /*
              if (maxTokenTransactionMain && maxTokenTransactionMain < minMain) {
                problem = true;
              }
              */
      
              // Return the result
              resolve({
                isHoneypot: honeypot,
                buyFee: buyTax,
                sellFee: sellTax,
                buyGas: buyGas,
                sellGas: sellGas,
                maxTokenTransaction: maxTokenTransaction,
                maxTokenTransactionMain: maxTokenTransactionMain,
                tokenSymbol: tokenSymbol,
                mainTokenSymbol: mainTokensymbol,
                priceImpact: priceImpact < 0.0 ? '0.0' : priceImpact,
                problem: problem,
                extra: extra,
              });
            } else {
              resolve({
                isHoneypot: false,
                tokenSymbol: tokenSymbol,
                mainTokenSymbol: mainTokensymbol,
                problem: true,
                liquidity: true,
                extra: 'Token liquidity is extremely low or has problems with the purchase!',
              });
            }
        } catch (err) {
            console.log(err)
            if (err.message.includes('Invalid JSON')) {
                resolve({
                error: true,
                });
            } else {
                // Probably the contract is self-destructed
                resolve({
                ExError: true,
                isHoneypot: false,
                tokenSymbol: null,
                mainTokenSymbol: mainTokensymbol,
                problem: true,
                extra: 'Token probably destroyed itself or does not exist!',
                });
            }
        }
    });
}

const honeypotCheck = async (tokenToCheck) => {
    var honeypot = await testHoneypot(
        web3,
        tokenToCheck,
        WETHAddress,
        routerAddress,
        multicallAddress,
        mainTokentoSell,
        2000000,
        1
    )
    console.log(honeypot)
    return honeypot
}

module.exports = { honeypotCheck }
honeypotCheck.js
// Affichage de honeypotCheck.js