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
export const messages = {
    iDTypePassport: {
        defaultMessage: 'Passport',
        description: 'Option for form field: Type of ID',
        id: 'form.field.label.iDTypePassport'
    },
    iDTypeNationalID: {
        defaultMessage: 'National ID number (in English)',
        description: 'Option for form field: Type of ID',
        id: 'form.field.label.iDTypeNationalID'
    },
    iDTypeDrivingLicense: {
        defaultMessage: 'Drivers License',
        description: 'Option for form field: Type of ID',
        id: 'form.field.label.iDTypeDrivingLicense'
    },
    iDTypeBRN: {
        defaultMessage: 'Birth registration number (in English)',
        description: 'Option for form field: Type of ID',
        id: 'form.field.label.iDTypeBRN'
    },
    iDTypeRefugeeNumber: {
        defaultMessage: 'Refugee Number',
        description: 'Option for form field: Type of ID',
        id: 'form.field.label.iDTypeRefugeeNumber'
    },
    iDTypeAlienNumber: {
        defaultMessage: 'Alien Number',
        description: 'Option for form field: Type of ID',
        id: 'form.field.label.iDTypeAlienNumber'
    },
    iDTypeNoId: {
        defaultMessage: 'No ID available',
        description: 'Option for form field: Type of ID',
        id: 'form.field.label.iDTypeNoID'
    },
    iDTypeOther: {
        defaultMessage: 'Other',
        description: 'Option for form field: Type of ID',
        id: 'form.field.label.iDTypeOther'
    },
    contactDetailsMother: {
        defaultMessage: 'Mother',
        description: 'Label for "Mother" select option',
        id: 'form.field.label.app.whoContDet.mother'
    },
    contactDetailsFather: {
        defaultMessage: 'Father',
        description: 'Label for "Father" select option',
        id: 'form.field.label.app.whoContDet.father'
    },
    someoneElse: {
        defaultMessage: 'Someone else',
        description: 'Other Label',
        id: 'form.field.label.someoneElse'
    },
    certificatePrintInAdvance: {
        defaultMessage: 'Print in advance for signatures and collection',
        description: 'Label for certificate collection option',
        id: 'form.field.label.certificatePrintInAdvance'
    },
    typeOfId: {
        defaultMessage: 'Type of ID',
        description: "Input label for certificate collector's id type options",
        id: 'form.field.label.typeOfId'
    },
    select: {
        defaultMessage: 'Select',
        description: 'Placeholder text for a select',
        id: 'form.field.select.placeholder'
    },
    iDTypeOtherLabel: {
        defaultMessage: 'Other type of ID',
        description: 'Label for form field: Other type of ID',
        id: 'form.field.label.iDTypeOtherLabel'
    },
    iD: {
        defaultMessage: 'ID Number',
        description: 'Label for form field: ID Number',
        id: 'form.field.label.iD'
    },
    firstName: {
        defaultMessage: 'First name',
        description: "Input label for certificate collector's first name",
        id: 'form.field.label.firstName'
    },
    lastName: {
        defaultMessage: 'Last name',
        description: "Input label for certificate collector's last name",
        id: 'form.field.label.lastName'
    },
    applicantsRelationWithChild: {
        defaultMessage: 'Relationship to child',
        description: 'Label for Relationship to child',
        id: 'form.field.label.applicantsRelationWithChild'
    },
    applicantName: {
        defaultMessage: 'Applicant',
        description: 'Form section name for Applicant',
        id: 'form.section.applicant.name'
    },
    applicantsRelationWithDeceased: {
        defaultMessage: 'Relationship to Deceased',
        description: 'Label for Relationship to Deceased select',
        id: 'form.field.label.applicantsRelationWithDeceased'
    },
    whoToCollect: {
        defaultMessage: 'Who is collecting the certificate?',
        description: 'The label for collector of certificate select',
        id: 'print.certificate.collector.whoToCollect'
    },
    certificateCollectorError: {
        defaultMessage: 'Please select who is collecting the certificate',
        description: 'Form level error for collector form',
        id: 'print.certificate.collector.form.error'
    },
    printCertificate: {
        defaultMessage: 'Print',
        description: 'The title of review button in list expansion actions',
        id: 'print.certificate.form.name'
    },
    certificateCollectionTitle: {
        defaultMessage: 'Certificate collection',
        description: 'The title of print certificate action',
        id: 'print.certificate.section.title'
    },
    otherCollectorFormTitle: {
        defaultMessage: 'What is their ID and name?',
        description: 'Title for other collector form',
        id: 'print.certificate.collector.other.title'
    },
    certificateOtherCollectorInfoError: {
        defaultMessage: 'Complete all the mandatory fields',
        description: 'Form level error for other collector information form',
        id: 'print.certificate.collector.other.form.error'
    },
    otherCollectorFormParagraph: {
        defaultMessage:
          'Because there are no details of this person on record, we need to capture their details:',
        description: 'Paragraph for other collector form',
        id: 'print.certificate.collector.other.paragraph'
    },
    certificateOtherCollectorAffidavitFormTitle: {
        defaultMessage: 'Attach a signed affidavit',
        description: 'Form title for other collector affidavit form',
        id: 'print.cert.coll.other.aff.form.title'
    },
    certificateOtherCollectorAffidavitError: {
        defaultMessage:
          'Attach a signed affidavit or click the checkbox if they do not have one.',
        description: 'Form level error for other collector affidavit form',
        id: 'print.cert.coll.other.aff.error'
    },
    certificateOtherCollectorAffidavitFormParagraph: {
        defaultMessage:
          'This document should clearly prove that the individual has the authority to collect the certificate',
        description: 'Form paragraph for other collector affidavit form',
        id: 'print.cert.coll.other.aff.paragraph'
    },
    signedAffidavitFileLabel: {
        defaultMessage: 'Signed affidavit',
        description: 'File label for signed affidavit',
        id: 'print.cert.coll.other.aff.label'
    },
    noLabel: {
        defaultMessage: ' ',
        id: 'print.certificate.noLabel'
    },
    noSignedAffidavitAvailable: {
        defaultMessage: "They don't have a signed affidavit",
        description: 'Label for no affidavit checkbox',
        id: 'print.cert.coll.other.aff.check'
    },
    preview: {
        defaultMessage: 'Certificate Preview',
        description: 'The title for certificate preview form',
        id: 'print.certificate.certificatePreview'
    }
  }
  