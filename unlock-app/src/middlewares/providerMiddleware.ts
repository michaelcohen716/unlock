import { SET_PROVIDER, providerReady } from '../actions/provider'
import { setError } from '../actions/error'
import {
  FATAL_MISSING_PROVIDER,
  FATAL_NOT_ENABLED_IN_PROVIDER,
} from '../errors'

interface Action {
  type: string
  [key: string]: any
}

function initializeProvider(provider: { enable?: () => any }) {
  // provider.enable exists for metamask and other modern dapp wallets and must be called, see:
  // https://medium.com/metamask/https-medium-com-metamask-breaking-change-injecting-web3-7722797916a8
  if (provider.enable) {
    return provider.enable()
  }
  // Default case, provider doesn't have an enable method, so it must already be ready
  return Promise.resolve(true)
}

const providerMiddleware = (config: any) => {
  return ({ getState, dispatch }: { [key: string]: any }) => {
    return function(next: any) {
      return function(action: Action) {
        if (action.type === SET_PROVIDER) {
          // Only initialize the provider if we haven't already done so.
          if (action.provider !== getState().provider) {
            const provider = config.providers[action.provider]
            if (provider) {
              initializeProvider(provider)
                .then(() => dispatch(providerReady()))
                .catch(() => dispatch(setError(FATAL_NOT_ENABLED_IN_PROVIDER)))
            } else {
              dispatch(setError(FATAL_MISSING_PROVIDER))
            }
          }
        }
        next(action)
      }
    }
  }
}

export default providerMiddleware
