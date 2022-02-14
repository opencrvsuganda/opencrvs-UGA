/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * OpenCRVS is also distributed under the terms of the Civil Registration
 * & Healthcare Disclaimer located at http://opencrvs.org/license.
 *
 * Copyright (C) The OpenCRVS Authors. OpenCRVS and the OpenCRVS
 * graphic logo are (registered/a) trademark(s) of Plan International.
 */
import * as Hapi from '@hapi/hapi'
import {
  createPersonEntry,
  createRelatedPersonEntry,
  createDeathEncounterEntry,
  createBundle,
  createDeathComposition,
  createTaskEntry,
  createDeathObservation,
  getIDFromResponse,
  IIncomingAddress
} from '../../../features/fhir/service'
import { postBundle, fetchFacilityByHRISCode } from '../../../features/fhir/api'

export interface IDeathNotification {
  dhis2_event: string
  deceased: {
    first_names_en?: string
    last_name_en: string
    first_names_bn?: string
    last_name_bn: string
    sex?: 'male' | 'female' | 'unknown'
    nid?: string
    nid_spouse?: string
    date_birth: string
  }
  father: {
    first_names_en?: string
    last_name_en: string
    first_names_bn?: string
    last_name_bn: string
    nid?: string
  }
  mother: {
    first_names_en?: string
    last_name_en: string
    first_names_bn?: string
    last_name_bn: string
    nid?: string
  }
  permanent_address: IIncomingAddress
  phone_number: string
  death_date: string
  cause_death_a_immediate?: string
  place_of_death?: {
    code: string
    name: string
  }
  union_death_ocurred: {
    id: string
    name: string
  }
}

export async function deathNotificationHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const notification = request.payload as IDeathNotification
  let contactNumber = notification && notification.phone_number
  if (contactNumber) {
    if (contactNumber.startsWith('26')) {
      contactNumber = `+${contactNumber}`
    } else if (!contactNumber.startsWith('0')) {
      contactNumber = `+260${contactNumber}`
    } else if (contactNumber.startsWith('0')) {
      contactNumber = `+260${contactNumber}`
    }
  }

  const deceased = await createPersonEntry(
    notification.deceased.nid || null,
    (notification.deceased.first_names_bn && [
      notification.deceased.first_names_bn
    ]) ||
      null,
    notification.deceased.last_name_bn,
    (notification.deceased.first_names_en && [
      notification.deceased.first_names_en
    ]) ||
      null,
    notification.deceased.last_name_en,
    null,
    notification.deceased.sex || 'unknown',
    null,
    notification.deceased.date_birth,
    notification.death_date
  )

  // Father is always picked as Informant
  // TODO: may need to change it based on the available data from dhis2
  const father = await createPersonEntry(
    notification.father.nid || null,
    (notification.father.first_names_bn && [
      notification.father.first_names_bn
    ]) ||
      null,
    notification.father.last_name_bn,
    (notification.father.first_names_en && [
      notification.father.first_names_en
    ]) ||
      null,
    notification.father.last_name_en,
    notification.permanent_address,
    'male',
    contactNumber,
    null,
    null
  )
  const relatedPerson = createRelatedPersonEntry('FATHER', father.fullUrl)

  const mother = await createPersonEntry(
    notification.mother.nid || null,
    (notification.mother.first_names_bn && [
      notification.mother.first_names_bn
    ]) ||
      null,
    notification.mother.last_name_bn,
    (notification.mother.first_names_en && [
      notification.mother.first_names_en
    ]) ||
      null,
    notification.mother.last_name_en,
    notification.permanent_address,
    'female',
    contactNumber,
    null,
    null
  )

  if (!notification.place_of_death) {
    throw new Error('Could not find any place of death')
  }
  const placeOfDeathFacilityLocation = await fetchFacilityByHRISCode(
    notification.place_of_death.code,
    request.headers.authorization
  )
  if (!placeOfDeathFacilityLocation) {
    throw new Error(
      `CANNOT FIND FACILITY LOCATION FOR DEATH NOTIFICATION: ${JSON.stringify(
        notification
      )}`
    )
  }

  const encounter = createDeathEncounterEntry(
    `Location/${placeOfDeathFacilityLocation.id}`,
    deceased.fullUrl
  )

  const composition = createDeathComposition(
    deceased.fullUrl,
    mother.fullUrl,
    father.fullUrl,
    relatedPerson.fullUrl,
    encounter.fullUrl
  )

  /*

  // When DHIS2 is integrated with A2I BBS codes, this process will be correct

  const lastRegLocId = notification.union_death_ocurred.id
  const lastRegLocation = await fetchUnionByFullBBSCode(
    lastRegLocId,
    request.headers.authorization
  )

  */

  // Contact type is always passing FATHER
  // TODO: may need to change it based on the available data from dhis2
  const task = await createTaskEntry(
    composition.fullUrl,
    'DEATH',
    'APPLICANT',
    contactNumber,
    notification.dhis2_event
  )

  const entries: fhir.BundleEntry[] = []
  entries.push(composition)
  entries.push(task)
  entries.push(deceased)
  entries.push(relatedPerson)
  entries.push(mother)
  entries.push(father)
  entries.push(encounter)
  if (notification.cause_death_a_immediate) {
    entries.push(
      createDeathObservation(
        encounter.fullUrl,
        notification.cause_death_a_immediate
      )
    )
  }

  const bundle = createBundle(entries)

  const response = await postBundle(bundle, request.headers.authorization)

  h.response({ composition_id: getIDFromResponse(response) }).code(201)
}
