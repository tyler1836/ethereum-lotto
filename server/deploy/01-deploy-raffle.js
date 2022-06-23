const { network, ethers } = require("hardhat");
const { development, networkConfig } = require("../helper-hardhat-config");
const {verify} = require('../utils/verify')
const fundAmt = ethers.utils.parseEther("2")

module.exports = async function({getNamedAccounts, deployments}){
    const {deploy, log} = deployments;
    const {deployer} = await getNamedAccounts();
    const chainId = network.config.chainId
    let vrfAddress, subId;

    if(development.includes(network.name)){
        const vrfCoord = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfAddress = vrfCoord.address
        const transactionResponse = await vrfCoord.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        subId = transactionReceipt.events[0].args.subId
        await vrfCoord.fundSubscription(subId, fundAmt)
    }else{
        vrfAddress = networkConfig[chainId]["vrfCoordinatorV2"]
        subId = networkConfig[chainId]["subscriptionId"]
    }

    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLimit = networkConfig[chainId]["gasLimit"]
    const cbgas = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["interval"]
    const args = [vrfAddress, entranceFee, gasLimit, subId, cbgas, interval]

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if(!development.includes(network.name) && process.env.ETHERSCAN_API){
        log("Verifying....")
        await verify(raffle.address, args)
    }
    log("---------------------")
}
module.exports.tags = ["all", "raffle"]