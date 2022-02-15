import {
  createBirthDeclaration,
  createDeathDeclaration,
  sendBirthNotification
} from './declare'
import { markAsRegistered, markDeathAsRegistered } from './register'
import { markAsCertified, markDeathAsCertified } from './certify'

import fetch from 'node-fetch'

import {
  getDayOfYear,
  getDaysInYear,
  startOfYear,
  setYear,
  addDays,
  differenceInDays,
  sub,
  add,
  startOfDay
} from 'date-fns'

import {
  createSystemClient,
  createUser,
  User,
  getToken,
  readToken,
  updateToken
} from './auth'
import { createConcurrentBuffer, getRandomFromBrackets, log } from './util'
import { Location, Facility } from './location'
import { COUNTRY_CONFIG_HOST } from './constants'
import { DistrictStatistic, getStatistics } from './statistics'

/*
 * The script logs in with a demo system admin
 * this prevents the script from being used in production, as there are no
 * users with a "demo" scope there
 */
const USERNAME = 'emmanuel.mayuka'
const PASSWORD = 'test'
export const VERIFICATION_CODE = '000000'
const FIELD_AGENTS = 10
const HOSPITAL_FIELD_AGENTS = 1
const REGISTRATION_AGENTS = 1
const LOCAL_REGISTRARS = 1
const CONCURRENCY = 1
const START_YEAR = 2021
const END_YEAR = 2022

const completionBrackets = [
  { range: [0, 44], weight: 0.3 },
  { range: [45, 365], weight: 0.3 },
  { range: [365, 365 * 5], weight: 0.2 },
  { range: [365 * 5, 365 * 20], weight: 0.2 }
]

async function getLocations(token: string) {
  const res = await fetch(`${COUNTRY_CONFIG_HOST}/locations`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-correlation': 'locations-' + Date.now().toString()
    }
  })
  const locations = await res.json()

  return Object.values<Location>(locations.data).filter(
    ({ jurisdictionType }) => jurisdictionType === 'DISTRICT'
  )
}

async function getFacilities(token: string) {
  const res = await fetch(`${COUNTRY_CONFIG_HOST}/facilities`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-correlation': 'facilities-' + Date.now().toString()
    }
  })
  const facilities = await res.json()

  return Object.values<Facility>(facilities.data)
}

async function keepTokensValid(users: User[]) {
  users.forEach(user => {
    const data = readToken(user.token)
    setTimeout(() => updateToken(user), data.exp * 1000 - Date.now() - 60000)
  })
}

async function createUsers(token: string, location: Location) {
  const fieldAgents = []
  const hospitals = []
  const registrationAgents = []
  const registrars = []
  const crvsOffices = (await getFacilities(token))
    .filter(({ type }) => type === 'CRVS_OFFICE')
    .filter(({ partOf }) => partOf === 'Location/' + location.id)
  if (crvsOffices.length === 0) {
    throw new Error(`Cannot find any CRVS offices for ${location.name}`)
  }
  const randomOffice =
    crvsOffices[Math.floor(Math.random() * crvsOffices.length)]
  log('Creating field agents')
  for (let i = 0; i < FIELD_AGENTS; i++) {
    fieldAgents.push(
      await createUser(token, randomOffice.id, {
        role: 'FIELD_AGENT'
      })
    )
  }
  log('Field agents created')
  log('Creating hospitals')
  for (let i = 0; i < HOSPITAL_FIELD_AGENTS; i++) {
    hospitals.push(await createSystemClient(token, randomOffice.id, 'HEALTH'))
  }

  log('Hospitals created')
  log('Creating registration agents')
  for (let i = 0; i < REGISTRATION_AGENTS; i++) {
    registrationAgents.push(
      await createUser(token, randomOffice.id, {
        role: 'REGISTRATION_AGENT'
      })
    )
  }
  log('Registration agents created')
  log('Creating local registrars')

  for (let i = 0; i < LOCAL_REGISTRARS; i++) {
    registrars.push(
      await createUser(token, randomOffice.id, {
        role: 'LOCAL_REGISTRAR'
      })
    )
  }
  log('Local registrars created')

  return { fieldAgents, hospitals, registrationAgents, registrars }
}

function calculateCrudeDeathRateForYear(
  location: string,
  year: number,
  crudeDeathRate: number,
  statistics: DistrictStatistic[]
) {
  const statistic = statistics.find(({ id }) => id === location)

  if (!statistic) {
    throw new Error(`Cannot find statistics for location ${location}`)
  }

  const yearlyStats =
    statistic.statistics[
      'http://opencrvs.org/specs/id/statistics-total-populations'
    ][year]
  if (!yearlyStats) {
    throw new Error(
      `Cannot find statistics for location ${location}, year ${year}`
    )
  }

  return (yearlyStats / 1000) * crudeDeathRate
}

function calculateCrudeBirthRatesForYear(
  location: string,
  year: number,
  statistics: DistrictStatistic[]
) {
  const statistic = statistics.find(({ id }) => id === location)

  if (!statistic) {
    throw new Error(
      `Cannot find statistics for location ${location}, year ${year}`
    )
  }
  const femalePopulation =
    statistic.statistics[
      'http://opencrvs.org/specs/id/statistics-female-populations'
    ][year]
  const malePopulation =
    statistic.statistics[
      'http://opencrvs.org/specs/id/statistics-male-populations'
    ][year]
  const crudeBirthRate =
    statistic.statistics[
      'http://opencrvs.org/specs/id/statistics-crude-birth-rates'
    ][year]
  if (
    [femalePopulation, malePopulation, crudeBirthRate].some(
      value => value === undefined
    )
  ) {
    throw new Error(
      `Cannot find statistics for location ${location}, year ${year}`
    )
  }

  return {
    male: (malePopulation / 1000) * crudeBirthRate,
    female: (femalePopulation / 1000) * crudeBirthRate
  }
}

const today = new Date()
const currentYear = today.getFullYear()

const writeTimestamps: number[] = []

function startThroughputTimer() {
  return setInterval(() => {
    console.log(
      'Throughput per minute:',
      writeTimestamps.findIndex(a => a < Date.now() - 1000 * 60) + 1
    )
  }, 3000)
}

async function getCrudeDeathRate(token: string): Promise<number> {
  const res = await fetch(`${COUNTRY_CONFIG_HOST}/crude-death-rate`, {
    headers: {
      Authentication: `Bearer ${token}`
    }
  })

  const { crudeDeathRate } = await res.json()
  return crudeDeathRate
}

async function main() {
  log('Fetching token for system administrator')
  const token = await getToken(USERNAME, PASSWORD)
  let statistics: Awaited<ReturnType<typeof getStatistics>>
  try {
    statistics = await getStatistics(token)
  } catch (error) {
    console.error(`
      /statistics endpoint was not found or returned an error.
      Make sure the endpoint is implemented in your country config package
    `)
    return
  }

  log('Got token for system administrator')
  log('Fetching locations')
  const locations = await (await getLocations(token))
    // TODO, remove
    .filter(({ id }) => '0fc529b4-4099-4b71-a26d-e367652b6921' === id)
  const facilities = await getFacilities(token)
  const crvsOffices = facilities.filter(({ type }) => type === 'CRVS_OFFICE')
  const healthFacilities = facilities.filter(
    ({ type }) => type === 'HEALTH_FACILITY'
  )

  log('Found', locations.length, 'locations')
  for (const location of locations) {
    log('Creating users for', location)

    // Create 30 users for each location:
    // - 15 field agents, ten hospitals, four registration agents and one registrar

    const users = await createUsers(token, location)
    const allUsers = [
      ...users.fieldAgents,
      ...users.hospitals,
      ...users.registrationAgents,
      ...users.registrars
    ]
    keepTokensValid(allUsers)
    const deathDeclarers = [...users.fieldAgents, ...users.registrationAgents]
    const birthDeclararers = [
      ...users.fieldAgents,
      ...users.hospitals,
      ...users.registrationAgents
    ]

    startThroughputTimer()

    const crudeDeathRate = await getCrudeDeathRate(users.fieldAgents[0].token)

    // For each year from (hard-coded at this stage) 5 years ago until now
    for (let y = END_YEAR; y >= START_YEAR; y--) {
      const isCurrentYear = y === currentYear
      const totalDeathsThisYear = calculateCrudeDeathRateForYear(
        location.id,
        isCurrentYear ? currentYear - 1 : y,
        crudeDeathRate,
        statistics
      )
      // Calculate crude birth & death rates for this district for both men and women
      const birthRates = calculateCrudeBirthRatesForYear(
        location.id,
        isCurrentYear ? currentYear - 1 : y,
        statistics
      )
      const days = Array.from({ length: getDaysInYear(y) }).map(() => 0)

      if (isCurrentYear) {
        // If we're processing the current year, only take into account
        // the days until today
        const currentDayNumber = getDayOfYear(today)

        // Remove future dates from the arrays
        days.splice(currentDayNumber - 1)

        // Adjust birth rates to the amount of days passed since the start of this year
        birthRates.female = (birthRates.female / days.length) * currentDayNumber
        birthRates.male = (birthRates.male / days.length) * currentDayNumber
      }

      const femalesPerDay = days.slice(0)
      const malesPerDay = days.slice(0)

      for (let i = 0; i < birthRates.female; i++) {
        femalesPerDay[Math.floor(Math.random() * days.length)]++
      }
      for (let i = 0; i < birthRates.male; i++) {
        malesPerDay[Math.floor(Math.random() * days.length)]++
      }
      log('Creating declarations for', location)

      // For each day:
      for (let d = days.length - 1; d >= 0; d--) {
        const submissionDate = addDays(startOfYear(setYear(new Date(), y)), d)

        const concurrency = createConcurrentBuffer(CONCURRENCY)

        /*
         *
         * DEATH DECLARATIONS
         *
         */

        const deathsToday = Math.round(totalDeathsThisYear / 365)

        log(
          'Creating death declarations for',
          submissionDate,
          'total:',
          deathsToday
        )

        for (let ix = 0; ix < deathsToday; ix++) {
          const randomUser =
            deathDeclarers[Math.floor(Math.random() * deathDeclarers.length)]
          const submissionTime = add(startOfDay(submissionDate), {
            seconds: 24 * 60 * 60 * Math.random()
          })
          const compositionId = await createDeathDeclaration(
            randomUser,
            Math.random() > 0.4 ? 'male' : 'female',
            submissionTime,
            location
          )
          const randomRegistrar =
            users.registrars[
              Math.floor(Math.random() * users.registrars.length)
            ]
          const id = await markDeathAsRegistered(randomRegistrar, compositionId)
          await markDeathAsCertified(randomRegistrar, id)
          writeTimestamps.unshift(Date.now())
        }

        /*
         *
         * BIRTH DECLARATIONS
         *
         */

        log(
          'Creating birth declarations for',
          submissionDate,
          'male:',
          malesPerDay[d],
          'female',
          femalesPerDay[d]
        )

        // Create birth declarations
        const totalChildBirths = malesPerDay[d] + femalesPerDay[d]
        const probabilityForMale = malesPerDay[d] / totalChildBirths

        for (let ix = 0; ix < Math.round(totalChildBirths); ix++) {
          await concurrency(async () => {
            const randomUser =
              birthDeclararers[
                Math.floor(Math.random() * birthDeclararers.length)
              ]

            const randomRegistrar =
              users.registrars[
                Math.floor(Math.random() * users.registrars.length)
              ]

            const isHospitalUser = users.hospitals.includes(randomUser)

            const sex = Math.random() < probabilityForMale ? 'male' : 'female'
            // This is here so that no creation timestamps would be equal
            // InfluxDB will otherwise interpret the events as the same exact measurement
            const submissionTime = add(startOfDay(submissionDate), {
              seconds: 24 * 60 * 60 * Math.random()
            })
            const completionDays = getRandomFromBrackets(completionBrackets)
            const birthDate = sub(submissionTime, { days: completionDays })

            const crvsOffice = crvsOffices.find(
              ({ id }) => id === randomUser.primaryOfficeId
            )

            if (!crvsOffice) {
              throw new Error(
                `CRVS office was not found with the id ${randomUser.primaryOfficeId}`
              )
            }

            const districtFacilities = healthFacilities.filter(
              ({ partOf }) => partOf.split('/')[1] === location.id
            )

            if (districtFacilities.length === 0) {
              throw new Error('Could not find any facilities for location')
            }

            const randomFacility =
              districtFacilities[
                Math.floor(Math.random() * districtFacilities.length)
              ]

            const id = isHospitalUser
              ? await sendBirthNotification(
                  randomUser,
                  sex,
                  birthDate,
                  randomFacility
                )
              : await createBirthDeclaration(
                  randomUser,
                  sex,
                  birthDate,
                  submissionTime,
                  location
                )

            const registeredToday =
              differenceInDays(today, submissionTime) === 0

            if (!registeredToday) {
              const registrationId = await markAsRegistered(randomRegistrar, id)

              await markAsCertified(randomRegistrar, registrationId)
            } else {
              log(
                'Will not register or certify because the declaration was added today'
              )
            }
            writeTimestamps.unshift(Date.now())
          })
        }
      }
    }

    allUsers.forEach(user => {
      user.stillInUse = false
    })
  }
}

main()
