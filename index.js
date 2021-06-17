require('dotenv').config()
const btoa = require('btoa')
const request = require('request-promise')
const express = require('express')
const OktaJwtVerifier = require('@okta/jwt-verifier')

const app = express()

const { ISSUER, DEFAULT_SCOPE } = process.env
const issuer = `${process.env.ORG_URL}/oauth2/${process.env.AUTH_SERVER_ID}`
const oktaJwtVerifier = new OktaJwtVerifier({ issuer: process.env.ISSUER, })

const cache = {
  expiration: null,
  scopes: [],
}

app.get('/test', async (req, res) => {
  try {
    const client_id = req.headers['client_id']
    const client_secret = req.headers['client_secret']
    if (!client_id || !client_secret) throw new Error('You must provide client_id and client_secret header')
    const token = btoa(`${client_id}:${client_secret}`)
    try {
      const { token_type, access_token } = await request({
        uri: `${ISSUER}/v1/token`,
        json: true,
        method: 'POST',
        headers: {
          authorization: `Basic ${token}`,
        },
        form: {
          grant_type: 'client_credentials',
          scope: DEFAULT_SCOPE,
        },
      })
      await oktaJwtVerifier.verifyAccessToken(access_token)
      res.json('Hello World!')
    } catch (error){
      res.json({ error: error.message })
    }    
  } catch (error) {
    res.json({ error: error.message })
  }
})

app.get('/', async (req, res) => {
  try {
    const { authorization } = req.headers
    if (!authorization) throw new Error('You must send an Authorization header')

    const [authType, token] = authorization.split(' ')
    if (authType !== 'Bearer') throw new Error('Expected a Bearer token')

    await oktaJwtVerifier.verifyAccessToken(token)
    res.json('Hello World!')
  } catch (error) {
    res.json({ error: error.message })
  }
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Listening on port ${port}`))
