import { useEffect, useState } from 'react'
import useConfig from '../utils/useConfig'
import useWindow from './useWindow'
import { getRouteFromWindow } from '../../utils/routes'

/**
 * hook for responding to postmessage events sent from the parent window.
 *
 * This hook is designed to allow declarative access to the values returned from
 * a postmessage event sent by a parent window. It requires that events are sent in
 * object format:
 *
 * {
 *   type: 'event-type',
 *   payload: <any data>
 * }
 *
 * It also validates security, matching origin against the value passed into the URL
 * (which is passed in by the paywall.min.js, source line is in paywall-builder/build.js)
 * It can also strictly validate the payload, and ignore any invalid values. This is
 * important to prevent malicious code from simply disabling the paywall by triggering
 * an exception. This hook does not attempt to run on the server or in the main window, and
 * is safe to use in any code that might run in the paywall.
 *
 * Usage is:
 *
 * const value = useListenForPostMessage(window, {
 *   type: 'type-name',
 *   validator: val => typeof val === 'string',
 *   defaultValue: 'hi'
 * })
 *
 * @param {*} window: the global window object. this is for mocking in tests
 * @param {Object} params: the function parameters
 * @param {string} params.type: the postmessage event type to monitor
 * @param {Function} [params.validator]: a function that accepts the message
 *                                       payload and returns true if it is valid
 * @param {*} [params.defaultValue]: a value you want to return instead of "undefined"
 *                                   if no message has been received yet
 */
export default function useListenForPostMessage({
  type,
  validator = false,
  defaultValue,
}) {
  const window = useWindow()
  const { isInIframe, isServer } = useConfig()
  const parent = window && window.parent
  const [data, setData] = useState(defaultValue)

  const saveData = event => {
    // origin is passed in by the paywall, see paywall-builder/build.js
    const { origin } = getRouteFromWindow(window)
    // **SECURITY CHECKS**
    // ignore messages that do not come from our parent window
    if (event.source !== parent || event.origin !== origin) return
    // data must be of shape { type: 'type', payload: <value> }
    if (!event.data || !event.data.type) return
    if (!event.data.hasOwnProperty('payload')) return
    if (typeof event.data.type !== 'string') return
    if (event.data.type !== type) return
    // optional validator
    if (!validator || (validator && validator(event.data.payload))) {
      // this triggers a re-render if and only if the value is different
      setData(event.data.payload)
    }
  }

  // this hook subscribes to messages on mount, and unsubscribes on unmount
  // it does not do it on update (component re-render)
  useEffect(() => {
    if (isServer || !isInIframe) return
    window.addEventListener('message', saveData)
    return () => {
      window.removeEventListener('message', saveData)
    }
  }, [])

  return data
}
