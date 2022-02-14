import faker from '@faker-js/faker'
import fetch from 'node-fetch'
import { VERIFICATION_CODE } from './index'

export type User = {
  username: string
  password: string
  token: string
  stillInUse: boolean
  primaryOfficeId: string
  isSystemUser: boolean
}

export async function getToken(
  username: string,
  password: string
): Promise<string> {
  const authenticateResponse = await fetch(
    'http://localhost:4040/authenticate',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation': username + '-' + Date.now()
      },
      body: JSON.stringify({
        username,
        password
      })
    }
  )
  const { nonce, token } = await authenticateResponse.json()

  if (token) {
    return token
  }

  const verifyResponse = await fetch('http://localhost:4040/verifyCode', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-correlation': username + '-' + Date.now()
    },
    body: JSON.stringify({
      nonce,
      code: VERIFICATION_CODE
    })
  })
  const data = await verifyResponse.json()

  if (!data.token) {
    throw new Error(
      `Failed to get token for user ${username}, password ${password}`
    )
  }

  return data.token
}

export async function getTokenForSystemClient(
  clientId: string,
  clientSecret: string
): Promise<string> {
  const authenticateResponse = await fetch(
    'http://localhost:4040/authenticateSystemClient',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation': clientId + '-' + Date.now()
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret
      })
    }
  )
  const res = await authenticateResponse.json()

  return res.token
}

export async function createUser(
  token: string,
  primaryOfficeId: string,
  overrides: Record<string, string>
) {
  const firstName = faker.name.firstName()
  const familyName = faker.name.lastName()

  const user = {
    name: [
      {
        use: 'en',
        firstNames: firstName,
        familyName: familyName
      }
    ],
    identifier: [
      {
        system: 'NATIONAL_ID',
        value: faker.datatype
          .number({ min: 100000000, max: 999999999 })
          .toString()
      }
    ],
    username:
      firstName.toLocaleLowerCase() + '.' + familyName.toLocaleLowerCase(),
    mobile: faker.phone.phoneNumber(),
    email: faker.internet.email(),
    primaryOffice: primaryOfficeId,
    ...overrides
  }

  const createUserRes = await fetch('http://localhost:7070/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-correlation': `createuser-${firstName}-${familyName}`
    },
    body: JSON.stringify({
      query: `
      mutation createOrUpdateUser($user: UserInput!) {
        createOrUpdateUser(user: $user) {
          username
          id
        }
      }
    `,
      variables: { user }
    })
  })

  const { data } = (await createUserRes.json()) as {
    data: { createOrUpdateUser: { username: string; id: string } }
  }
  const userToken = await getToken(data.createOrUpdateUser.username, 'test')

  const res = await fetch('http://localhost:7070/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
      'x-correlation': `createuser-${firstName}-${familyName}`
    },
    body: JSON.stringify({
      query: `
      mutation activateUser($userId: String!, $password: String!, $securityQNAs: [SecurityQuestionAnswer]!) {
        activateUser(userId: $userId, password: $password, securityQNAs: $securityQNAs)
      }
    `,
      variables: {
        userId: data.createOrUpdateUser.id,
        password: 'test',
        securityQNAs: []
      }
    })
  })

  if (res.status !== 200) {
    console.log(res)

    throw new Error('Could not activate user')
  }

  return {
    ...data.createOrUpdateUser,
    token: userToken,
    primaryOfficeId,
    stillInUse: true,
    password: 'test',
    isSystemUser: false
  }
}

export async function createSystemClient(
  token: string,
  officeId: string,
  scope: 'HEALTH' | 'NATIONAL_ID' | 'EXTERNAL_VALIDATION' | 'AGE_CHECK'
): Promise<User> {
  const systemAdmin = await createUser(token, officeId, {
    role: 'LOCAL_SYSTEM_ADMIN'
  })

  const createUserRes = await fetch(
    'http://localhost:3030/registerSystemClient',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${systemAdmin.token}`,
        'x-correlation': `create-system-scope`
      },
      body: JSON.stringify({ scope })
    }
  )

  const credentials: {
    client_id: string
    client_secret: string
    sha_secret: string
  } = await createUserRes.json()

  const systemToken = await getTokenForSystemClient(
    credentials.client_id,
    credentials.client_secret
  )

  return {
    token: systemToken,
    username: credentials.client_id,
    password: credentials.client_secret,
    stillInUse: true,
    primaryOfficeId: officeId,
    isSystemUser: true
  }
}

export function readToken(token: string) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
}

export async function updateToken(user: User) {
  if (!user.stillInUse) {
    return
  }
  const token = user.isSystemUser
    ? await getTokenForSystemClient(user.username, user.password)
    : await getToken(user.username, user.password)

  user.token = token

  const data = readToken(token)

  setTimeout(() => updateToken(user), data.exp * 1000 - Date.now() - 60000)
}
