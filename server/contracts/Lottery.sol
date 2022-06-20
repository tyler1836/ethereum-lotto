// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

error Raffle_NotEnoughETHEntered();
error Raffle__TransferFailed();

contract Raffle is VRFConsumerBaseV2{
    //State Variables
    uint256 immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subId;
    uint16 private constant REQ_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant NUM_WORDS = 1;

    //Lottery Variables
    address private s_recentWinner;
    //Events
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed player);

    constructor(
        address vrfCoordinatorV2,
         uint256 entranceFee, 
         bytes32 gasLane,
         uint64 subId,
         uint32 callbackGasLimit
         ) VRFConsumerBaseV2(vrfCoordinatorV2)
         {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subId = subId;
        i_callbackGasLimit = callbackGasLimit;
        }

    function enterRaffle()public payable{
        if(msg.value < i_entranceFee){
            revert Raffle_NotEnoughETHEntered();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    function requestRandomWinner
    () 
        external 
    {
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
        i_gasLane,
        i_subId,
        REQ_CONFIRMATIONS,
        i_callbackGasLimit,
        NUM_WORDS
        );
        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords
    (
        uint256, /*requestId,*/
        uint256[] memory randomWords
    ) 
        internal 
        override
    {  
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if(!success){
          revert Raffle__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    function getEntranceFee() public view returns(uint256){
        return i_entranceFee;
    }
    function getPlayer(uint256 index) public view returns(address){
        return s_players[index];
    }
    function getRecentWinner() public view returns(address){
        return s_recentWinner;
    }
}