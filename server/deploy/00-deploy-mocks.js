const { development, networkConfig } = require("../helper-hardhat-config") 
const {network} = require('hardhat')

const baseFee = ethers.utils.parseEther("0.25")
const gasPriceLink = 1e9

module.exports = async function ({getNamedAccounts, deployments}){
    const {deploy, log} = deployments
    const {deployer} = await getNamedAccounts()
    const chainId = network.config.chainId
    const args = [baseFee, gasPriceLink]

    if(chainId == 31337){
        log("Local network detected! Deploying mocks...")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args
        })
        log("mocks Deployed")
        log("------------------------")
    }

}

module.exports.tags = ['all', 'mocks']