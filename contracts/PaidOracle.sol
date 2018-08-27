pragma solidity ^0.4.24;

import "./BasicOracle.sol";
import "zeppelin-solidity/contracts/math/Math.sol";
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

contract PaidOracle is BasicOracle {

  uint256 public reward;

  constructor(
    address _dataSource,
    uint256 _reward
  )
    BasicOracle(_dataSource)
    public 
    payable
  {
    require(_dataSource != address(0), "Require a non-null dataSource");
    reward = _reward;
  }

  /**
   * @dev Returns the oracle reward or the contract's balance if it's less than the reward
   */
  function getReward() 
    public 
    view
    returns 
    (uint256)
  {
    return Math.min256(reward, address(this).balance);
  }

  /*
   *  Internal functions
   */
  function _resultWasSet()
  internal
  {
    require(isResultSet(), "Result hasn't been set yet.");
    require(dataSource != address(0));
    dataSource.transfer(getReward());
  }
}