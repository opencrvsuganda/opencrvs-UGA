import fetch from 'node-fetch'
import { User } from './users'
import { faker } from '@faker-js/faker'
import { sub, differenceInDays, add, max } from 'date-fns'
import { log } from './util'

import { Facility, Location } from './location'
import { COUNTRY_CONFIG_HOST } from './constants'

function randomWeightInGrams() {
  return Math.round(2.5 + 2 * Math.random() * 1000)
}

export async function sendBirthNotification(
  { username, token }: User,
  sex: 'male' | 'female',
  birthDate: Date,
  location: Facility
) {
  const familyName = faker.name.lastName()
  const firstNames = faker.name.firstName()
  const requestStart = Date.now()

  const createBirthNotification = await fetch(
    `${COUNTRY_CONFIG_HOST}/dhis2-notification/birth`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-correlation': `birth-notification-${firstNames}-${familyName}`
      },
      body: JSON.stringify({
        dhis2_event: '1111',
        child: {
          first_names: firstNames,
          last_name: familyName,
          weight: randomWeightInGrams().toString(),
          sex: sex
        },
        father: {
          first_names: 'Dad',
          last_name: familyName,
          nid: faker.datatype
            .number({ min: 100000000, max: 999999999 })
            .toString()
        },
        mother: {
          first_names: 'Mom',
          last_name: familyName,
          dob: sub(birthDate, { years: 20 })
            .toISOString()
            .split('T')[0],
          nid: faker.datatype
            .number({ min: 100000000, max: 999999999 })
            .toString()
        },
        phone_number:
          '+2607' + faker.datatype.number({ min: 10000000, max: 99999999 }), // Required!
        date_birth: birthDate.toISOString().split('T')[0],
        place_of_birth: location.id
      })
    }
  )

  if (!createBirthNotification.ok) {
    throw new Error('Failed to create a birth notification')
  }

  const res = await createBirthNotification.json()

  const requestEnd = Date.now()
  log(
    'Creating birth notification',
    firstNames,
    familyName,
    'born',
    birthDate.toISOString().split('T')[0],
    'created by',
    username,
    `(took ${requestEnd - requestStart}ms)`
  )

  return res.compositionId
}

export async function createBirthDeclaration(
  { username, token }: User,
  sex: 'male' | 'female',
  birthDate: Date,
  declarationTime: Date,
  location: Location
) {
  const timeFilling = Math.round(100000 + Math.random() * 100000) // 100 - 200 seconds
  const familyName = faker.name.lastName()
  const firstNames = faker.name.firstName()

  const requestStart = Date.now()
  const createDeclarationRes = await fetch('http://localhost:7070/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-correlation': `declare-${firstNames}-${familyName}`
    },
    body: JSON.stringify({
      query: `
        mutation submitMutation($details: BirthRegistrationInput!) {
          createBirthRegistration(details: $details) {
            compositionId
          }
        }`,
      variables: {
        details: {
          createdAt: declarationTime.toISOString(),
          registration: {
            contact: 'MOTHER',
            contactPhoneNumber:
              '+2607' + faker.datatype.number({ min: 10000000, max: 99999999 }),
            contactRelationship: '',
            status: [
              {
                timestamp: sub(declarationTime, {
                  seconds: timeFilling / 1000
                }),
                timeLoggedMS: timeFilling
              }
            ],
            draftId: faker.datatype.uuid()
          },
          presentAtBirthRegistration: 'MOTHER',
          child: {
            name: [
              {
                use: 'en',
                firstNames,
                familyName
              }
            ],
            gender: sex,
            birthDate: birthDate.toISOString().split('T')[0],
            multipleBirth: Math.round(Math.random() * 5)
          },
          attendantAtBirth: 'PHYSICIAN',
          birthType: 'SINGLE',
          weightAtBirth: Math.round(2.5 + 2 * Math.random() * 10) / 10,
          eventLocation: {
            address: {
              country: 'FAR',
              state: location.partOf.split('/')[1],
              district: location.id,
              city: faker.address.city(),
              postalCode: faker.address.zipCode(),
              line: [
                faker.address.streetAddress(),
                faker.address.zipCode(),
                '',
                '',
                '',
                '',
                'URBAN'
              ]
            },
            type: 'PRIVATE_HOME'
          },
          mother: {
            nationality: ['FAR'],
            identifier: [
              {
                id: faker.datatype.number({ min: 100000000, max: 999999999 }),
                type: 'NATIONAL_ID'
              }
            ],
            name: [
              {
                use: 'en',
                familyName: familyName
              }
            ],
            birthDate: sub(birthDate, { years: 20 })
              .toISOString()
              .split('T')[0],
            maritalStatus: 'MARRIED',
            address: [
              {
                type: 'PLACE_OF_HERITAGE',
                line: ['', '', 'Chief name', '', '', ''],
                country: 'FAR',
                state: 'ec34cfe2-b566-4140-af22-71ff17d832d6',
                district: '9cedaf28-8c0f-4d5f-b1c1-c96c437b0ba7'
              },
              {
                type: 'PERMANENT',
                line: ['', '', '', '', '', '', 'URBAN'],
                country: 'FAR',
                state: 'ec34cfe2-b566-4140-af22-71ff17d832d6',
                district: 'd9437614-1cb2-4d70-b938-eb93c87a4310'
              },
              {
                type: 'CURRENT',
                country: 'FAR',
                state: location.partOf.split('/')[1],
                district: location.id,
                city: faker.address.city(),
                postalCode: faker.address.zipCode(),
                line: [
                  faker.address.streetAddress(),
                  faker.address.zipCode(),
                  '',
                  '',
                  '',
                  '',
                  'URBAN'
                ]
              }
            ]
          }
        }
      }
    })
  })
  const requestEnd = Date.now()
  log(
    'Creating',
    firstNames,
    familyName,
    'born',
    birthDate.toISOString().split('T')[0],
    'declared',
    declarationTime.toISOString().split('T')[0],
    'days in between',
    differenceInDays(declarationTime, birthDate),
    'created by',
    username,
    `(took ${requestEnd - requestStart}ms)`
  )
  const result = await createDeclarationRes.json()
  if (!result?.data?.createBirthRegistration?.compositionId) {
    log(result)
    throw new Error('Birth declaration was not created')
  }
  return result.data.createBirthRegistration.compositionId
}

export async function createDeathDeclaration(
  { username, token }: User,
  sex: 'male' | 'female',
  declarationTime: Date,
  location: Location
) {
  const familyName = faker.name.lastName()
  const firstNames = faker.name.firstName()

  const requestStart = Date.now()

  const birthDate = sub(declarationTime, { days: Math.random() * 365 * 20 })
  const deathDay = max([
    add(birthDate, { days: 2 }),
    sub(declarationTime, { days: Math.random() * 20 })
  ])

  const createDeclarationRes = await fetch('http://localhost:7070/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-correlation': `declare-death-${firstNames}-${familyName}`
    },
    body: JSON.stringify({
      operationName: 'submitMutation',
      variables: {
        details: {
          createdAt: declarationTime.toISOString(),
          registration: {
            contact: 'APPLICANT',
            contactPhoneNumber:
              '+2607' + faker.datatype.number({ min: 10000000, max: 99999999 }),
            contactRelationship: '',
            draftId: faker.datatype.uuid(),
            status: [{}]
          },
          causeOfDeath: 'Natural cause',
          deceased: {
            identifier: [
              {
                id: faker.datatype.number({ min: 100000000, max: 999999999 }),
                type: 'NATIONAL_ID'
              },
              {
                id: faker.datatype.number({ min: 100000000, max: 999999999 }),
                type: 'SOCIAL_SECURITY_NO'
              }
            ],
            nationality: ['FAR'],
            name: [
              {
                use: 'en',
                firstNames: firstNames,
                familyName: familyName
              }
            ],
            birthDate: birthDate.toISOString().split('T')[0],
            gender: sex,
            maritalStatus: 'MARRIED',
            address: [
              {
                type: 'PERMANENT',
                line: [
                  faker.address.streetAddress(),
                  faker.address.zipCode(),
                  '',
                  '',
                  '',
                  '',
                  'URBAN'
                ],
                country: 'FAR',
                state: location.partOf.split('/')[1],
                district: location.id
              }
            ],
            deceased: {
              deceased: true,
              deathDate: deathDay.toISOString().split('T')[0]
            }
          },
          mannerOfDeath: 'NATURAL_CAUSES',
          eventLocation: {
            address: {
              type: 'PERMANENT',
              line: [
                faker.address.streetAddress(),
                faker.address.zipCode(),
                '',
                '',
                '',
                '',
                'URBAN'
              ],
              country: 'FAR',
              state: location.partOf.split('/')[1],
              district: location.id
            },
            type: 'PERMANENT'
          },
          informant: {
            individual: {
              nationality: ['FAR'],
              identifier: [
                {
                  id: faker.datatype.number({ min: 100000000, max: 999999999 }),
                  type: 'NATIONAL_ID'
                }
              ],
              name: [
                {
                  use: 'en',
                  firstNames: firstNames,
                  familyName: familyName
                }
              ],
              address: [
                {
                  type: 'PERMANENT',
                  line: [
                    faker.address.streetAddress(),
                    faker.address.zipCode(),
                    '',
                    '',
                    '',
                    '',
                    'URBAN'
                  ],
                  country: 'FAR',
                  state: location.partOf.split('/')[1],
                  district: location.id
                }
              ]
            },
            relationship: 'SON'
          },
          father: {
            name: [
              {
                use: 'en',
                familyName: familyName
              }
            ]
          },
          mother: {
            name: [
              {
                use: 'en',
                familyName: familyName
              }
            ]
          }
        }
      },
      query: `mutation submitMutation($details: DeathRegistrationInput!) {
            createDeathRegistration(details: $details) {
              trackingId
              compositionId
          }
      }
      `
    })
  })
  const requestEnd = Date.now()
  log(
    'Creating a death declaration for',
    firstNames,
    familyName,
    'born',
    birthDate.toISOString().split('T')[0],
    'died',
    deathDay.toISOString().split('T')[0],
    'declared',
    declarationTime.toISOString().split('T')[0],
    'days in between',
    differenceInDays(declarationTime, deathDay),
    'created by',
    username,
    `(took ${requestEnd - requestStart}ms)`
  )
  const result = await createDeclarationRes.json()
  if (!result?.data?.createDeathRegistration?.compositionId) {
    log(result)

    throw new Error('Death declaration was not created')
  }
  return result.data.createDeathRegistration.compositionId
}

export const FETCH_REGISTRATION_QUERY = `
  query data($id: ID!) {
    fetchBirthRegistration(id: $id) {
      _fhirIDMap
      id
      child {
        id
        multipleBirth
        name {
          use
          firstNames
          familyName
      }
      birthDate
      gender
    }
    informant {
        id
        relationship
        otherRelationship
        individual {
          id
          identifier {
            id
            type
            otherType
        }
        name {
            use
            firstNames
            familyName
        }
        occupation
        nationality
        birthDate
        address {
            type
            line
            district
            state
            city
            postalCode
            country
        }
      }
    }
    primaryCaregiver {
        parentDetailsType
        primaryCaregiver {
          name {
            use
            firstNames
            familyName
        }
        telecom {
            system
            value
            use
        }
      }
      reasonsNotApplying {
          primaryCaregiverType
          reasonNotApplying
          isDeceased
      }
    }
    mother {
        id
        name {
          use
          firstNames
          familyName
      }
      birthDate
      maritalStatus
      occupation
      dateOfMarriage
      educationalAttainment
      nationality
      identifier {
          id
          type
          otherType
      }
      address {
          type
          line
          district
          state
          city
          postalCode
          country
      }
      telecom {
          system
          value
      }
    }
    father {
        id
        name {
          use
          firstNames
          familyName
      }
      birthDate
      maritalStatus
      occupation
      dateOfMarriage
      educationalAttainment
      nationality
      identifier {
          id
          type
          otherType
      }
      address {
          type
          line
          district
          state
          city
          postalCode
          country
      }
      telecom {
          system
          value
      }
    }
    registration {
        id
        contact
        contactRelationship
        contactPhoneNumber
        attachments {
          data
          type
          contentType
          subject
      }
      status {
          comments {
            comment
        }
        type
        timestamp
      }
      type
      trackingId
      registrationNumber
    }
    attendantAtBirth
    weightAtBirth
    birthType
    eventLocation {
        type
        address {
          line
          district
          state
          city
          postalCode
          country
      }
    }
    presentAtBirthRegistration
  }
}
`
export async function fetchRegistration(user: User, compositionId: string) {
  const fetchDeclarationRes = await fetch('http://localhost:7070/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${user.token}`,
      'x-correlation': `fetch-declaration-${compositionId}`
    },
    body: JSON.stringify({
      query: FETCH_REGISTRATION_QUERY,
      variables: {
        id: compositionId
      }
    })
  })

  const res = await fetchDeclarationRes.json()
  if (!res.data?.fetchBirthRegistration) {
    throw new Error(
      `Fetching birth declaration data for ${compositionId} failed`
    )
  }

  return res.data.fetchBirthRegistration
}

const FETCH_DEATH_REGISTRATION_QUERY = `query data($id: ID!) {
  fetchDeathRegistration(id: $id) {
    _fhirIDMap
    id
    deceased {
      id
      name {
        use
        firstNames
        familyName
      }
      birthDate
      age
      gender
      maritalStatus
      nationality
      identifier {
        id
        type
        otherType
      }
      gender
      deceased {
        deathDate
      }
      address {
        type
        line
        district
        state
        city
        postalCode
        country
      }
    }
    informant {
      id
      relationship
      otherRelationship
      individual {
        id
        identifier {
          id
          type
          otherType
        }
        name {
          use
          firstNames
          familyName
        }
        nationality
        occupation
        birthDate
        telecom {
          system
          value
        }
        address {
          type
          line
          district
          state
          city
          postalCode
          country
        }
      }
    }
    father {
      id
      name {
        use
        firstNames
        familyName
      }
    }
    mother {
      id
      name {
        use
        firstNames
        familyName
      }
    }
    spouse {
      id
      name {
        use
        firstNames
        familyName
      }
    }
    medicalPractitioner {
      name
      qualification
      lastVisitDate
    }
    registration {
      id
      contact
      contactRelationship
      contactPhoneNumber
      attachments {
        data
        type
        contentType
        subject
      }
      status {
        type
        timestamp
      }
      type
      trackingId
      registrationNumber
    }
    eventLocation {
      id
      type
      address {
        type
        line
        district
        state
        city
        postalCode
        country
      }
    }
    mannerOfDeath
    causeOfDeath
    maleDependentsOfDeceased
    femaleDependentsOfDeceased
  }
}
`
export async function fetchDeathRegistration(
  user: User,
  compositionId: string
) {
  const fetchDeclarationRes = await fetch('http://localhost:7070/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${user.token}`,
      'x-correlation': `fetch-declaration-${compositionId}`
    },
    body: JSON.stringify({
      query: FETCH_DEATH_REGISTRATION_QUERY,
      variables: {
        id: compositionId
      }
    })
  })

  const res = await fetchDeclarationRes.json()
  if (!res.data?.fetchDeathRegistration) {
    throw new Error(
      `Fetching death declaration data for ${compositionId} failed`
    )
  }

  return res.data.fetchDeathRegistration
}
