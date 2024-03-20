// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;
import {LibBitmap} from "solady/src/utils/LibBitmap.sol";
import {IAllowance} from "./IAllowance.sol";

contract Inscriboooor {
  using LibBitmap for LibBitmap.Bitmap;

  error AlreadyClaimed();

  LibBitmap.Bitmap bitmap;

  function mint(address _to, uint256 _tokenId) public {
    bitmap.set(_tokenId);
  }
}
