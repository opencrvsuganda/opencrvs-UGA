import {
  createBirthDeclaration,
  createDeathDeclaration,
  sendBirthNotification
} from './declare'
import { markAsRegistered, markDeathAsRegistered } from './register'
import { markAsCertified, markDeathAsCertified } from './certify'
import {
  getStatistics,
  LocationStatistic
} from '../farajaland/features/administrative/statistics'

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

/*
 * The script logs in with a demo system admin
 * this prevents the script from being used in production, as there are no
 * users with a "demo" scope there
 */
const USERNAME = 'emmanuel.mayuka'
const PASSWORD = 'test'
export const VERIFICATION_CODE = '000000'
const FIELD_AGENTS = 3
const HOSPITAL_FIELD_AGENTS = 1
const REGISTRATION_AGENTS = 1
const LOCAL_REGISTRARS = 1
const START_YEAR = 2021
const END_YEAR = 2022

const completionBrackets = [
  { range: [0, 44], weight: 0.3 },
  { range: [45, 365], weight: 0.3 },
  { range: [365, 365 * 5], weight: 0.2 },
  { range: [365 * 5, 365 * 20], weight: 0.2 }
]

async function getLocations(token: string) {
  const res = await fetch('http://localhost:3040/locations', {
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
  const res = await fetch('http://localhost:3040/facilities', {
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
  statistics: LocationStatistic[]
) {
  const statistic = statistics.find(({ name }) => name === location)

  if (!statistic) {
    throw new Error(`Cannot find statistics for location ${location}`)
  }

  const yearlyStats = statistic.years.find(stat => year === stat.year)
  if (!yearlyStats) {
    throw new Error(
      `Cannot find statistics for location ${location}, year ${year}`
    )
  }

  return (yearlyStats.population / 1000) * crudeDeathRate
}

function calculateCrudeBirthRatesForYear(
  location: string,
  year: number,
  statistics: LocationStatistic[]
) {
  const statistic = statistics.find(({ name }) => name === location)

  if (!statistic) {
    throw new Error(
      `Cannot find statistics for location ${location}, year ${year}`
    )
  }
  const yearlyStats = statistic.years.find(stat => year === stat.year)
  if (!yearlyStats) {
    throw new Error(
      `Cannot find statistics for location ${location}, year ${year}`
    )
  }

  const { male_population, female_population, crude_birth_rate } = yearlyStats

  return {
    male: (male_population / 1000) * crude_birth_rate,
    female: (female_population / 1000) * crude_birth_rate
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
  const res = await fetch('http://localhost:3040/crude-death-rate', {
    headers: {
      Authentication: `Bearer ${token}`
    }
  })

  const { crudeDeathRate } = await res.json()
  return crudeDeathRate
}

async function main() {
  const statistics = await getStatistics()

  log('Fetching token for system administrator')
  const token = await getToken(USERNAME, PASSWORD)

  log('Got token for system administrator')
  log('Fetching locations')
  const locations = await (await getLocations(token))
    // TODO, remove
    .filter(({ id }) => '0fc529b4-4099-4b71-a26d-e367652b6921' === id)

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
        location.name,
        isCurrentYear ? currentYear - 1 : y,
        crudeDeathRate,
        statistics
      )
      // Calculate crude birth & death rates for this district for both men and women
      const birthRates = calculateCrudeBirthRatesForYear(
        location.name,
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

        // create that number of birth and death applications for field agents & registration offices and notifications for hospitals
        // “Application started” in performance management should show realistic proportions of applications started from the current types (e.g. Field Agents: 40%, Hospitals: 30%, Reg Offices: 30%)"

        // Add a dynamic range for declaration & birthday difference
        // If this would just be a static number like 60, then and we run this script on Jan 1st 2022
        // all of the days 60 days before would have a chance to be declared in a future time

        const concurrency = createConcurrentBuffer(1)

        // Create death declarations
        const deathsToday = Math.round(totalDeathsThisYear / 365)

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
        }

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

            const id = isHospitalUser
              ? await sendBirthNotification(
                  randomUser,
                  sex,
                  birthDate,
                  randomUser.primaryOfficeId
                )
              : await createBirthDeclaration(
                  randomUser,
                  sex,
                  birthDate,
                  submissionTime,
                  randomUser.primaryOfficeId
                )

            const registeredToday =
              differenceInDays(today, submissionTime) === 0

            if (!isHospitalUser && !registeredToday) {
              const registrationId = await markAsRegistered(randomRegistrar, id)

              await markAsCertified(randomRegistrar, registrationId)
              await new Promise(resolve => setTimeout(resolve, 10000))
            } else {
              log('Will not register or certify', {
                isHospitalUser,
                registeredToday
              })
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
