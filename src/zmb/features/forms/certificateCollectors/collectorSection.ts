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
import {
    CertificateSection,
    CHECKBOX_GROUP,
    FIELD_WITH_DYNAMIC_DEFINITIONS,
    IFormSection,
    PARAGRAPH,
    RADIO_GROUP,
    SELECT_WITH_OPTIONS,
    SIMPLE_DOCUMENT_UPLOADER,
    TEXT
  } from '..'
  import {
    identityOptions,
  } from './identity'
  import { conditionals } from '../utils'
  import { messages as formMessages } from './messages'
  export enum RadioSize {
    LARGE = "large",
    NORMAL = "normal"
  }
  export type ViewType = 'form' | 'preview' | 'review' | 'hidden'
  export const PDF_DOCUMENT_VIEWER = 'PDF_DOCUMENT_VIEWER'

  export const certCollectorGroupApplicationFormSection: IFormSection = {
    id: CertificateSection.CertificateCollectorGroup,
    viewType: 'form',
    name: formMessages.printCertificate,
    title: formMessages.certificateCollectionTitle,
    groups: [
      {
        id: 'certCollectorWithoutfather',
        title: formMessages.whoToCollect,
        error: formMessages.certificateCollectorError,
        fields: [
          {
            name: 'type',
            type: RADIO_GROUP,
            size: RadioSize.LARGE,
            label: formMessages.whoToCollect,
            required: true,
            initialValue: '',
            validate: [],
            options: [{ 
                value: 'MOTHER', 
                label: formMessages.contactDetailsMother 
            },
              { value: 'OTHER', label: formMessages.someoneElse },
              {
                value: 'PRINT_IN_ADVANCE',
                label: formMessages.certificatePrintInAdvance
              }
            ]
          }
        ]
      },
      {
        id: 'certCollectorWithoutMother',
        title: formMessages.whoToCollect,
        error: formMessages.certificateCollectorError,
        fields: [
          {
            name: 'type',
            type: RADIO_GROUP,
            size: RadioSize.LARGE,
            label: formMessages.whoToCollect,
            required: true,
            initialValue: '',
            validate: [],
            options: [
              { value: 'FATHER', label: formMessages.contactDetailsFather },
              { value: 'OTHER', label: formMessages.someoneElse },
              {
                value: 'PRINT_IN_ADVANCE',
                label: formMessages.certificatePrintInAdvance
              }
            ]
          }
        ]
      },
      {
        id: 'certCollectorWithParent',
        title: formMessages.whoToCollect,
        error: formMessages.certificateCollectorError,
        fields: [
          {
            name: 'type',
            type: RADIO_GROUP,
            size: RadioSize.LARGE,
            label: formMessages.whoToCollect,
            required: true,
            initialValue: '',
            validate: [],
            options: [
              { value: 'MOTHER', label: formMessages.contactDetailsMother },
              { value: 'FATHER', label: formMessages.contactDetailsFather },
              { value: 'OTHER', label: formMessages.someoneElse },
              {
                value: 'PRINT_IN_ADVANCE',
                label: formMessages.certificatePrintInAdvance
              }
            ]
          }
        ]
      },
      {
        id: 'certCollectorWithoutParent',
        title: formMessages.whoToCollect,
        error: formMessages.certificateCollectorError,
        fields: [
          {
            name: 'type',
            type: RADIO_GROUP,
            size: RadioSize.LARGE,
            label: formMessages.whoToCollect,
            required: true,
            initialValue: '',
            validate: [],
            options: [
              { value: 'OTHER', label: formMessages.someoneElse },
              {
                value: 'PRINT_IN_ADVANCE',
                label: formMessages.certificatePrintInAdvance
              }
            ]
          }
        ]
      }
    ]
  }

  export const collectBirthCertificateFormSection: IFormSection = {
    id: CertificateSection.Collector,
    viewType: 'form',
    name: formMessages.printCertificate,
    title: formMessages.certificateCollectionTitle,
    groups: [
      {
        id: 'otherCertCollector',
        conditionals: [conditionals.certCollectorOther],
        title: formMessages.otherCollectorFormTitle,
        error: formMessages.certificateOtherCollectorInfoError,
        fields: [
          {
            name: 'paragraph',
            type: PARAGRAPH,
            label: formMessages.otherCollectorFormParagraph,
            initialValue: '',
            validate: []
          },
          {
            name: 'iDType',
            type: SELECT_WITH_OPTIONS,
            label: formMessages.typeOfId,
            required: true,
            initialValue: '',
            validate: [],
            placeholder: formMessages.select,
            options: identityOptions
          },
          {
            name: 'iDTypeOther',
            type: TEXT,
            label: formMessages.iDTypeOtherLabel,
            required: true,
            initialValue: '',
            validate: [],
            conditionals: [conditionals.iDType]
          },
          {
            name: 'iD',
            type: FIELD_WITH_DYNAMIC_DEFINITIONS,
            dynamicDefinitions: {
              label: {
                dependency: 'iDType',
                labelMapper: {
                    "operation": "identityNameMapper"
                }
              },
              helperText: {
                dependency: 'iDType',
                helperTextMapper: {
                    "operation": "identityHelperTextMapper"
                }
              },
              type: {
                kind: 'dynamic',
                dependency: 'iDType',
                typeMapper: {
                    "operation": "identityTypeMapper"
                }
              },
              validate: [
                {
                    validator: {
                    operation: "validIDNumber"
                    },
                    dependencies: ['iDType']
                }
              ]
            },
            label: formMessages.iD,
            required: true,
            initialValue: '',
            validate: [],
            conditionals: [conditionals.iDAvailable]
          },
          {
            name: 'firstName',
            type: TEXT,
            label: formMessages.firstName,
            required: true,
            initialValue: '',
            validate: []
          },
          {
            name: 'lastName',
            type: TEXT,
            label: formMessages.lastName,
            required: true,
            initialValue: '',
            validate: []
          },
          {
            name: 'relationship',
            type: TEXT,
            label: formMessages.applicantsRelationWithChild,
            required: true,
            initialValue: '',
            validate: []
          }
        ]
      },
      {
        id: 'affidavit',
        conditionals: [conditionals.certCollectorOther],
        title: formMessages.certificateOtherCollectorAffidavitFormTitle,
        error: formMessages.certificateOtherCollectorAffidavitError,
        fields: [
          {
            name: 'paragraph',
            type: PARAGRAPH,
            label:
              formMessages.certificateOtherCollectorAffidavitFormParagraph,
            initialValue: '',
            validate: []
          },
          {
            name: 'affidavitFile',
            type: SIMPLE_DOCUMENT_UPLOADER,
            label: formMessages.signedAffidavitFileLabel,
            description: formMessages.noLabel,
            initialValue: '',
            required: false,
            validate: []
          },
          {
            name: 'noAffidavitAgreement',
            type: CHECKBOX_GROUP,
            label: formMessages.noLabel,
            initialValue: [],
            validate: [],
            required: false,
            options: [
              {
                value: 'AFFIDAVIT',
                label: formMessages.noSignedAffidavitAvailable
              }
            ]
          }
        ]
      }
    ]
  }
  
  export const collectDeathCertificateFormSection: IFormSection = {
    id: CertificateSection.Collector,
    viewType: 'form',
    name: formMessages.printCertificate,
    title: formMessages.certificateCollectionTitle,
    groups: [
      {
        id: 'certCollector',
        title: formMessages.whoToCollect,
        error: formMessages.certificateCollectorError,
        fields: [
          {
            name: 'type',
            type: RADIO_GROUP,
            size: RadioSize.LARGE,
            label: formMessages.whoToCollect,
            required: true,
            initialValue: true,
            validate: [],
            options: [
              { value: 'INFORMANT', label: formMessages.applicantName },
              { value: 'OTHER', label: formMessages.someoneElse },
              {
                value: 'PRINT_IN_ADVANCE',
                label: formMessages.certificatePrintInAdvance
              }
            ]
          }
        ]
      },
      {
        id: 'otherCertCollector',
        conditionals: [conditionals.certCollectorOther],
        title: formMessages.otherCollectorFormTitle,
        error: formMessages.certificateOtherCollectorInfoError,
        fields: [
          {
            name: 'paragraph',
            type: PARAGRAPH,
            label: formMessages.otherCollectorFormParagraph,
            initialValue: '',
            validate: []
          },
          {
            name: 'iDType',
            type: SELECT_WITH_OPTIONS,
            label: formMessages.typeOfId,
            required: true,
            initialValue: '',
            validate: [],
            placeholder: formMessages.select,
            options: identityOptions
          },
          {
            name: 'iDTypeOther',
            type: TEXT,
            label: formMessages.iDTypeOtherLabel,
            required: true,
            initialValue: '',
            validate: [],
            conditionals: [conditionals.iDType]
          },
          {
            name: 'iD',
            type: FIELD_WITH_DYNAMIC_DEFINITIONS,
            dynamicDefinitions: {
              label: {
                dependency: 'iDType',
                labelMapper: {
                    "operation": "identityNameMapper"
                }
              },
              type: {
                kind: 'dynamic',
                dependency: 'iDType',
                typeMapper: {
                    "operation": "identityTypeMapper"
                }
              },
              validate: [
                {
                    validator: {
                    operation: "validIDNumber"
                    },
                    dependencies: ['iDType']
                }
              ]
            },
            label: formMessages.iD,
            required: true,
            initialValue: '',
            validate: [],
            conditionals: [conditionals.iDAvailable]
          },
          {
            name: 'firstName',
            type: TEXT,
            label: formMessages.firstName,
            required: true,
            initialValue: '',
            validate: []
          },
          {
            name: 'lastName',
            type: TEXT,
            label: formMessages.lastName,
            required: true,
            initialValue: '',
            validate: []
          },
          {
            name: 'relationship',
            type: TEXT,
            label: formMessages.applicantsRelationWithDeceased,
            required: true,
            initialValue: '',
            validate: []
          }
        ]
      },
      {
        id: 'affidavit',
        conditionals: [conditionals.certCollectorOther],
        title: formMessages.certificateOtherCollectorAffidavitFormTitle,
        error: formMessages.certificateOtherCollectorAffidavitError,
        fields: [
          {
            name: 'paragraph',
            type: PARAGRAPH,
            label:
              formMessages.certificateOtherCollectorAffidavitFormParagraph,
            initialValue: '',
            validate: []
          },
          {
            name: 'affidavitFile',
            type: SIMPLE_DOCUMENT_UPLOADER,
            label: formMessages.signedAffidavitFileLabel,
            description: formMessages.noLabel,
            initialValue: '',
            required: false,
            validate: []
          },
          {
            name: 'noAffidavitAgreement',
            type: CHECKBOX_GROUP,
            label: formMessages.noLabel,
            required: false,
            initialValue: [],
            validate: [],
            options: [
              {
                value: 'AFFIDAVIT',
                label: formMessages.noSignedAffidavitAvailable
              }
            ]
          }
        ]
      }
    ]
  }

  export const certificatePreview: IFormSection = {
    id: CertificateSection.CertificatePreview,
    viewType: 'form' as ViewType,
    name: formMessages.preview,
    title: formMessages.preview,
    groups: [
      {
        id: 'certificate-preview-view-group',
        fields: [
          {
            name: 'certificate',
            type: PDF_DOCUMENT_VIEWER,
            label: formMessages.noLabel,
            initialValue: '',
            validate: []
          }
        ]
      }
    ]
  }

  export const collectorSection = {
    sections: [
        collectBirthCertificateFormSection, 
        collectDeathCertificateFormSection,
        certificatePreview,
        certCollectorGroupApplicationFormSection
    ]
  }