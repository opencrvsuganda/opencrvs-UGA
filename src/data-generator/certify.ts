import fetch from 'node-fetch'
import { User } from './users'

import { log, nullsToEmptyString } from './util'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fetchRegistration, fetchDeathRegistration } from './declare'
import { Location } from './location'
import faker from '@faker-js/faker'

export async function markAsCertified(
  user: User,
  id: string,
  location: Location,
  createdAt: Date
) {
  const { token, username } = user
  const declaration = await fetchRegistration(user, id)

  const requestStart = Date.now()

  const details = {
    createdAt,
    registration: {
      contact: declaration.registration.contact,
      contactPhoneNumber: declaration.registration.contactPhoneNumber,
      contactRelationship: '',
      _fhirID: declaration.registration.id,
      trackingId: declaration.registration.trackingId,
      registrationNumber: declaration.registration.registrationNumber,
      status: [
        {
          timestamp: createdAt.toISOString()
        }
      ],
      certificates: [
        {
          hasShowedVerifiedDocument: false,
          payments: [
            {
              type: 'MANUAL',
              total: 10,
              amount: 10,
              outcome: 'COMPLETED',
              date: createdAt
            }
          ],
          data:
            'data:application/pdf;base64,' +
            readFileSync(join(__dirname, './signature.pdf')).toString('base64'),
          collector: {
            relationship: 'MOTHER'
          }
        }
      ],
      attachments: [],
      draftId: declaration.id
    },
    presentAtBirthRegistration:
      declaration.presentAtBirthRegistration || 'BOTH_PARENTS',
    child: declaration.child && {
      name: declaration.child.name,
      gender: declaration.child.gender,
      birthDate: declaration.child.birthDate,
      multipleBirth: declaration.child.multipleBirth,
      _fhirID: declaration.child.id
    },
    attendantAtBirth: declaration.attendantAtBirth || 'PHYSICIAN',
    birthType: declaration.birthType || 'SINGLE',
    weightAtBirth:
      declaration.weightAtBirth ||
      Math.round(2.5 + 2 * Math.random() * 10) / 10,
    eventLocation: declaration._fhirIDMap?.eventLocation
      ? {
          _fhirID: declaration._fhirIDMap.eventLocation
        }
      : {
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
          type: 'CRVS_OFFICE'
        },
    mother: declaration.mother && {
      nationality: declaration.mother.nationality,
      identifier: declaration.mother.identifier,
      name: declaration.mother.name,
      maritalStatus: declaration.mother.maritalStatus,
      address: declaration.mother.address,
      _fhirID: declaration.mother.id
    },
    // TODO - in some cases _fhirIDMap is returned as null. Why is this?
    _fhirIDMap: declaration._fhirIDMap || {}
  }

  delete declaration?.registration?.id
  delete declaration?.child?.id
  delete declaration?.mother?.id
  nullsToEmptyString(details)
  const certifyDeclarationRes = await fetch('http://localhost:7070/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-correlation': `registration-${id}`
    },
    body: JSON.stringify({
      query: `
        mutation submitMutation($id: ID!, $details: BirthRegistrationInput!) {
          markBirthAsCertified(id: $id, details: $details)
        }`,
      variables: {
        id,
        details
      }
    })
  })
  const requestEnd = Date.now()
  const result = await certifyDeclarationRes.json()
  if (result.errors) {
    console.error(JSON.stringify(result.errors, null, 2))
    console.error(JSON.stringify(declaration))

    details.registration.certificates.forEach(cert => {
      cert.data = 'REDACTED'
    })

    console.error(JSON.stringify(details))
    throw new Error('Birth declaration could not be certified')
  }

  log(
    'Birth declaration',
    result.data.markBirthAsCertified,
    'is now certified by',
    username,
    `(took ${requestEnd - requestStart}ms)`
  )

  return result.data.markBirthAsCertified
}

export async function markDeathAsCertified(
  user: User,
  id: string,
  createdAt: Date
) {
  const { token, username } = user
  const declaration = await fetchDeathRegistration(user, id)

  const requestStart = Date.now()

  const details = {
    createdAt: createdAt,
    registration: {
      contact: declaration.registration.contact,
      contactPhoneNumber: declaration.registration.contactPhoneNumber,
      contactRelationship: '',
      _fhirID: declaration.registration.id,
      trackingId: declaration.registration.trackingId,
      registrationNumber: declaration.registration.registrationNumber,
      attachments: [],
      draftId: declaration.id,
      status: [
        {
          timeLoggedMS: Math.round(9999 * Math.random())
        }
      ]
    },
    deceased: declaration.deceased && {
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
    informant: declaration.informant && {
      individual: declaration.informant.individual && {
        nationality: declaration.informant.individual.nationality,
        identifier: declaration.informant.individual.identifier,
        name: declaration.informant.individual.name,
        address: declaration.informant.individual.address,
        _fhirID: declaration.informant.individual.id
      },
      relationship: declaration.informant.relationship,
      _fhirID: declaration.informant.id
    },
    father: declaration.father && {
      name: declaration.father.name,
      _fhirID: declaration.father.id
    },
    mother: declaration.mother && {
      name: declaration.mother.name,
      _fhirID: declaration.mother.id
    },
    _fhirIDMap: declaration._fhirIDMap
  }
  delete declaration?.registration?.id
  delete declaration?.deceased?.id
  delete declaration?.informant?.id
  delete declaration?.father?.id
  delete declaration?.mother?.id
  delete declaration?.informant?.individual?.id
  delete declaration?.eventLocation?.id

  nullsToEmptyString(details)

  const certifyDeclarationRes = await fetch('http://localhost:7070/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-correlation': `registration-${id}`
    },
    body: JSON.stringify({
      query: `
        mutation submitMutation($id: ID!, $details: DeathRegistrationInput!) {
          markDeathAsCertified(id: $id, details: $details)
        }`,
      variables: {
        id,
        details
      }
    })
  })
  const requestEnd = Date.now()
  const result = await certifyDeclarationRes.json()
  if (result.errors) {
    console.error(JSON.stringify(result.errors, null, 2))
    console.error(JSON.stringify(declaration))
    console.error(JSON.stringify(details))
    throw new Error('Death declaration could not be certified')
  }

  log(
    'Death declaration',
    result.data.markDeathAsCertified,
    'is now certified by',
    username,
    `(took ${requestEnd - requestStart}ms)`
  )

  return result.data.markDeathAsCertified
}
