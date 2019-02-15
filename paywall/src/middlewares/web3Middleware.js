/* eslint promise/prefer-await-to-then: 0 */

import { LOCATION_CHANGE } from 'connected-react-router'
import { UPDATE_LOCK, addLock, updateLock, ADD_LOCK } from '../actions/lock'
import { updateKey, addKey } from '../actions/key'
import { updateAccount, SET_ACCOUNT } from '../actions/accounts'
import { setError } from '../actions/error'
import {
  addTransaction,
  updateTransaction,
  ADD_TRANSACTION,
  NEW_TRANSACTION,
} from '../actions/transaction'

import Web3Service from '../services/web3Service'
import { lockRoute } from '../utils/routes'

// This middleware listen to redux events and invokes the web3Service API.
// It also listen to events from web3Service and dispatches corresponding actions
export default function web3Middleware({ getState, dispatch }) {
  const web3Service = new Web3Service()

  web3Service.on('account.updated', (account, update) => {
    dispatch(updateAccount(update))
  })

  /**
   * The Lock was changed.
   * Should we get the balance of the lock owner?
   */
  web3Service.on('lock.updated', (address, update) => {
    const lock = getState().locks[address]
    if (lock) {
      // Only dispatch the updates which are more recent than the current value
      if (!lock.asOf || lock.asOf < update.asOf) {
        dispatch(updateLock(lock.address, update))
      }
    } else {
      dispatch(addLock(address, update))
    }
  })

  /**
   * When a key was saved, we reload the corresponding lock because
   * it might have been updated (balance, outstanding keys...)
   */
  web3Service.on('key.saved', (keyId, key) => {
    web3Service.getLock(key.lock)
    if (getState().account.address === key.owner) {
      web3Service.refreshAccountBalance(getState().account)
    }
    web3Service.getKeyByLockForOwner(key.lock, key.owner)
  })

  web3Service.on('key.updated', (id, update) => {
    if (getState().keys[id]) {
      dispatch(updateKey(id, update))
    } else {
      // That key does not exist yet
      dispatch(addKey(id, update))
    }
  })

  web3Service.on('transaction.updated', (transactionHash, update) => {
    dispatch(updateTransaction(transactionHash, update))
  })

  web3Service.on('transaction.new', transactionHash => {
    dispatch(
      addTransaction({
        hash: transactionHash,
      })
    )
  })

  web3Service.on('error', error => {
    dispatch(setError(error.message))
  })

  return function(next) {
    return function(action) {
      if (action.type === ADD_TRANSACTION) {
        web3Service.getTransaction(action.transaction.hash)
      }

      if (action.type === NEW_TRANSACTION) {
        web3Service.getTransaction(action.transaction.hash, action.transaction)
      }

      next(action)

      // note: this needs to be after the reducer has seen it, because refreshAccountBalance
      // triggers 'account.update' which dispatches UPDATE_ACCOUNT. The reducer assumes that
      // ADD_ACCOUNT has reached it first, and throws an exception. Putting it after the
      // reducer has a chance to populate state removes this race condition.
      if (action.type === SET_ACCOUNT) {
        // TODO: when the account has been updated we should reset web3Service and remove all listeners
        // So that pending API calls do not interract with our "new" state.
        web3Service.refreshAccountBalance(action.account)
        web3Service.getPastLockCreationsTransactionsForUser(
          action.account.address
        )
        const {
          router: {
            location: { pathname },
          },
        } = getState()

        const { lockAddress, prefix } = lockRoute(pathname)
        if (lockAddress && prefix === 'paywall') {
          web3Service.getKeyByLockForOwner(lockAddress, action.account.address)
        }
      }

      if (action.type === ADD_LOCK || action.type === UPDATE_LOCK) {
        const lock = getState().locks[action.address]
        if (getState().account) {
          web3Service.getKeyByLockForOwner(
            lock.address,
            getState().account.address
          )
        }
      } else if (
        action.type === LOCATION_CHANGE &&
        action.payload.location &&
        action.payload.location.pathname
      ) {
        // Location was changed, get the matching lock, if we are on a paywall page
        const { lockAddress } = lockRoute(action.payload.location.pathname)
        web3Service.getLock(lockAddress)
      }
    }
  }
}