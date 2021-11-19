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
import { messages } from './messages'

export const NATIONAL_ID = 'NATIONAL_ID'
export const BIRTH_REGISTRATION_NUMBER = 'BIRTH_REGISTRATION_NUMBER'
export const PASSPORT = 'PASSPORT'
export const DEATH_REGISTRATION_NUMBER = 'DEATH_REGISTRATION_NUMBER'
export const DRIVING_LICENSE = 'DRIVING_LICENSE'
export const REFUGEE_NUMBER = 'REFUGEE_NUMBER'
export const ALIEN_NUMBER = 'ALIEN_NUMBER'
export const OTHER = 'OTHER'
export const NO_ID = 'NO_ID'
export const SOCIAL_SECURITY_NO = 'SOCIAL_SECURITY_NO'

export const identityOptions = [
  { value: PASSPORT, label: messages.iDTypePassport },
  { value: NATIONAL_ID, label: messages.iDTypeNationalID },
  {
    value: DRIVING_LICENSE,
    label: messages.iDTypeDrivingLicense
  },
  {
    value: BIRTH_REGISTRATION_NUMBER,
    label: messages.iDTypeBRN
  },
  {
    value: REFUGEE_NUMBER,
    label: messages.iDTypeRefugeeNumber
  },
  { value: ALIEN_NUMBER, label: messages.iDTypeAlienNumber },
  { value: NO_ID, label: messages.iDTypeNoId },
  { value: OTHER, label: messages.iDTypeOther }
]