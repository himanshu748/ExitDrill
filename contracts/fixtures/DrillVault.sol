// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol';
contract TestAsset is ERC20 {
 constructor() ERC20('Drill test asset','tDAI') { _mint(msg.sender,1000000 ether); }
}
contract DrillVault is ERC4626 {
 uint256 public immutable mode;
 constructor(IERC20 token,uint256 mode_) ERC20('Drill test shares','tSHARE') ERC4626(token) {mode=mode_;}
 function maxRedeem(address owner) public view override returns(uint256){
  uint256 b=super.maxRedeem(owner); if(mode==1)return 0; if(mode==2 && b>25 ether)return 25 ether; return b;
 }
 function _withdraw(address caller,address receiver,address owner,uint256 assets,uint256 shares) internal override {
  require(mode!=3,'FIXTURE_REDEEM_REVERT'); require(shares<=maxRedeem(owner),'FIXTURE_LIMIT');
  super._withdraw(caller,receiver,owner,assets,shares);
 }
}
