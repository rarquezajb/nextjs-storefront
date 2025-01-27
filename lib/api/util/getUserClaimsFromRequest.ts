import { ServerResponse } from 'http'

import { shopperAuthClient } from './api-auth-client'
import { isShopperAuthExpired } from './config-helpers'
import {
  decodeParseCookieValue,
  getAuthCookieName,
  prepareSetCookieValue,
} from '@/lib/helpers/cookieHelper'
import type { KiboRequest } from '@/lib/types'

import type { NextApiRequest, NextApiResponse } from 'next'

const getUserClaimsFromRequest = async (
  req: NextApiRequest | KiboRequest,
  res: NextApiResponse | ServerResponse
) => {
  if (req.headers['x-vol-exclude-user-claims']) {
    return
  }

  try {
    const cookies = req?.cookies
    let authTicket = decodeParseCookieValue(cookies[getAuthCookieName()])

    if (authTicket && isShopperAuthExpired(authTicket) === false) {
      return authTicket.accessToken
    }

    const accountId = authTicket?.accountId

    // shopper is anonymous
    // else logged in user ticket needs to be refreshed
    if (!authTicket) {
      authTicket = await shopperAuthClient.anonymousAuth()
    } else {
      const response = await shopperAuthClient.refreshUserAuth(authTicket)
      if (response.accessToken) {
        authTicket = response
      }
    }

    res.setHeader(
      'Set-Cookie',
      getAuthCookieName() + '=' + prepareSetCookieValue({ ...authTicket, accountId }) + ';path=/'
    )

    return authTicket.accessToken
  } catch (err) {
    console.error(err)
  }
  return
}
export default getUserClaimsFromRequest
