const Units = require('ethereumjs-units')
const Web3Utils = require('web3-utils')
const deployLocks = require('../../helpers/deployLocks')
const shouldFail = require('../../helpers/shouldFail')

const unlockContract = artifacts.require('../Unlock.sol')
const getUnlockProxy = require('../../helpers/proxy')

let unlock, locks

contract('Lock / erc721 / safeTransferFrom', accounts => {
  before(async () => {
    unlock = await getUnlockProxy(unlockContract)
    locks = await deployLocks(unlock, accounts[0])
  })

  // function safeTransferFrom() still uses transferFrom() under the hood, but adds an additional check afterwards. transferFrom is already well-tested, so here we add a few checks to test only the new functionality.
  const from = accounts[1]
  const to = accounts[2]
  let ID

  before(async () => {
    // first, let's purchase a brand new key that we can transfer
    await locks['FIRST'].purchaseFor(from, {
      value: Units.convert('0.01', 'eth', 'wei'),
      from,
    })
    ID = await locks['FIRST'].getTokenIdFor.call(from)
  })

  it('should work if no data is passed in', async () => {
    await locks['FIRST'].safeTransferFrom(from, to, ID, {
      from,
    })
    let ownerOf = await locks['FIRST'].ownerOf.call(ID)
    assert.equal(ownerOf, to)
  })

  it('should work if some data is passed in', async () => {
    await locks['FIRST'].purchaseFor(accounts[7], {
      value: Units.convert('0.01', 'eth', 'wei'),
      from: accounts[7],
    })
    ID = await locks['FIRST'].getTokenIdFor.call(accounts[7])
    const method = 'safeTransferFrom(address,address,uint256,bytes)'
    await locks['FIRST'].methods[method](
      accounts[7],
      accounts[6],
      ID,
      Web3Utils.toHex('Julien'),
      {
        from: accounts[7],
      }
    )
    let ownerOf = await locks['FIRST'].ownerOf.call(ID)
    assert.equal(ownerOf, accounts[6])
    // while we may pass data to the safeTransferFrom function, it is not currently utilized in any way other than being passed to the `onERC721Received` function in MixinTransfer.sol
  })

  it('should fail if trying to transfer a key to a contract which does not implement onERC721Received', async () => {
    await locks['FIRST'].purchaseFor(accounts[5], {
      value: Units.convert('0.01', 'eth', 'wei'),
      from: accounts[5],
    })
    ID = await locks['FIRST'].getTokenIdFor.call(accounts[5])
    // A contract which does NOT implement onERC721Received:
    let nonCompliantContract = unlock.address
    await shouldFail(
      locks['FIRST'].safeTransferFrom(accounts[5], nonCompliantContract, ID, {
        from: accounts[5],
      }),
      'NO_FALLBACK'
    )
    // make sure the key was not transferred
    let ownerOf = await locks['FIRST'].ownerOf.call(ID)
    assert.equal(ownerOf, accounts[5])
  })
})
