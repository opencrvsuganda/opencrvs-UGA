import fetch from 'node-fetch'
import { User } from './auth'
import { add } from 'date-fns'
import { log, nullsToEmptyString } from './util'
import { fetchRegistration, fetchDeathRegistration } from './declare'

export async function markAsRegistered(user: User, id: string) {
  const { token, username } = user
  const declaration = await fetchRegistration(user, id)

  const createdAt = add(
    new Date(declaration.registration.status.pop().timestamp),
    {
      days: 1
    }
  )

  const MINUTES_15 = 1000 * 60 * 15
  const details = {
    createdAt,
    registration: {
      contact: declaration.registration.contact,
      contactPhoneNumber: declaration.registration.contactPhoneNumber,
      contactRelationship: '',
      _fhirID: declaration.registration.id,
      trackingId: declaration.registration.trackingId,
      status: [
        {
          // This is needed to avoid the following error from Metrics service:
          // Error: No time logged extension found in task, task ID: 93c59687-b3d1-4d58-91c3-6888f1987f2a
          timeLoggedMS: Math.round(MINUTES_15 + MINUTES_15 * Math.random()),
          timestamp: createdAt.toISOString()
        }
      ],
      attachments: [],
      draftId: declaration.id
    },
    presentAtBirthRegistration: declaration.presentAtBirthRegistration,
    child: {
      name: declaration.child.name,
      gender: declaration.child.gender,
      birthDate: declaration.child.birthDate,
      multipleBirth: declaration.child.multipleBirth,
      _fhirID: declaration.child.id
    },
    // Hospital notifications have a limited set of data in them
    // This part amends the missing fields if needed
    birthType: declaration.birthType || 'SINGLE',
    attendantAtBirth: declaration.attendantAtBirth,
    weightAtBirth: declaration.weightAtBirth,
    eventLocation: {
      _fhirID: declaration._fhirIDMap.eventLocation
    },
    mother: {
      nationality: declaration.mother.nationality,
      identifier: declaration.mother.identifier,
      name: declaration.mother.name,
      maritalStatus: declaration.mother.maritalStatus,
      address: declaration.mother.address,
      _fhirID: declaration.mother.id
    },
    _fhirIDMap: declaration._fhirIDMap
  }
  delete declaration.registration.id
  delete declaration.child.id
  delete declaration.mother.id

  nullsToEmptyString(details)

  const requestStart = Date.now()
  const reviewDeclarationRes = await fetch('http://localhost:7070/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-correlation': `registration-${id}`
    },
    body: JSON.stringify({
      query: `
        mutation submitMutation($id: ID!, $details: BirthRegistrationInput) {
          markBirthAsRegistered(id: $id, details: $details) {
            id
        }
      }`,
      variables: {
        id,
        details
      }
    })
  })
  const requestEnd = Date.now()
  const result = await reviewDeclarationRes.json()
  if (result.errors) {
    console.error(JSON.stringify(result.errors, null, 2))
    throw new Error('Birth declaration was not registered')
  }

  log(
    'Declaration',
    result.data.markBirthAsRegistered.id,
    'is now reviewed by',
    username,
    `(took ${requestEnd - requestStart}ms)`
  )

  return result.data.markBirthAsRegistered.id
}
export async function markDeathAsRegistered(user: User, id: string) {
  const { token, username } = user
  const declaration = await fetchDeathRegistration(user, id)

  const createdAt = add(
    new Date(declaration.registration.status.pop().timestamp),
    {
      days: 1
    }
  )

  const details = {
    createdAt: createdAt,
    registration: {
      contact: declaration.registration.contact,
      contactPhoneNumber: declaration.registration.contactPhoneNumber,
      contactRelationship: '',
      _fhirID: declaration.registration.id,
      trackingId: declaration.registration.trackingId,
      attachments: [],
      draftId: declaration.id,
      status: [
        {
          timeLoggedMS: Math.round(9999 * Math.random())
        }
      ]
    },
    deceased: {
      identifier: declaration.deceased.identifier,
      nationality: declaration.deceased.nationality,
      name: declaration.deceased.name,
      birthDate: declaration.deceased.birthDate,
      gender: declaration.deceased.gender,
      maritalStatus: declaration.deceased.maritalStatus,
      address: declaration.deceased.address,
      _fhirID: declaration.deceased.id,
      deceased: declaration.deceased.deceased
    },
    mannerOfDeath: declaration.deceased.mannerOfDeath,
    eventLocation: declaration.eventLocation,
    causeOfDeath: declaration.deceased.causeOfDeath,
    informant: {
      individual: {
        nationality: declaration.informant.individual.nationality,
        identifier: declaration.informant.individual.identifier,
        name: declaration.informant.individual.name,
        address: declaration.informant.individual.address,
        _fhirID: declaration.informant.individual.id
      },
      relationship: declaration.informant.relationship,
      _fhirID: declaration.informant.id
    },
    father: {
      name: declaration.father.name,
      _fhirID: declaration.father.id
    },
    mother: {
      name: declaration.mother.name,
      _fhirID: declaration.mother.id
    },
    _fhirIDMap: declaration._fhirIDMap
  }
  delete declaration.registration.id
  delete declaration.deceased.id
  delete declaration.informant.id
  delete declaration.father.id
  delete declaration.mother.id
  delete declaration.informant.individual.id
  delete declaration.eventLocation.id

  nullsToEmptyString(details)

  const requestStart = Date.now()
  const reviewDeclarationRes = await fetch('http://localhost:7070/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-correlation': `registration-${id}`
    },
    body: JSON.stringify({
      query: `
      mutation submitMutation($id: ID!, $details: DeathRegistrationInput) {
        markDeathAsRegistered(id: $id, details: $details) {
          id
          registration {
            id
            status {
              id
              user {
                id
                name {
                  use
                  firstNames
                  familyName
                }
              role
            }
            location {
                id
                name
                alias
              }
            office {
                name
                alias
                address {
                  district
                  state
                }
            }
            type
            timestamp
            comments {
                comment
              }
          }
        }
      }
    }

  `,
      variables: {
        id,
        details
      }
    })
  })
  const requestEnd = Date.now()
  const result = await reviewDeclarationRes.json()
  if (result.errors) {
    console.error(JSON.stringify(result.errors, null, 2))
    throw new Error('Death declaration was not registered')
  }

  log(
    'Declaration',
    result.data.markDeathAsRegistered.id,
    'is now reviewed by',
    username,
    `(took ${requestEnd - requestStart}ms)`
  )

  return result.data.markDeathAsRegistered.id
}
