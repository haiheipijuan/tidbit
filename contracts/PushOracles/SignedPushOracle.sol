pragma solidity ^0.4.24;

import "./PushOracle.sol";
import "../SignedOracle.sol";

contract SignedPushOracle is SignedOracle, PushOracle {

  constructor (
    address _dataSource,
    IOracleHandler _handler
  )
    public
    SignedOracle(_dataSource)
    PushOracle(_handler)
  {}

}