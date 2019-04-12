import { internal } from 'boom'
import chalk from 'chalk'
import { getFromFhir, IStatistic } from '../../utils/bn'
import * as fs from 'fs'
import { ADMIN_STRUCTURE_SOURCE } from '../../../constants'

const divisionsStatistics = JSON.parse(
  fs
    .readFileSync(`${ADMIN_STRUCTURE_SOURCE}/statistics/divisions.json`)
    .toString()
)

const districtsStatistics = JSON.parse(
  fs
    .readFileSync(`${ADMIN_STRUCTURE_SOURCE}/statistics/districts.json`)
    .toString()
)

function generateStatisticalIdentifiers(sourceStatistic: IStatistic) {
  const malePopulations = []
  const femalePopulations = []
  const totalPopulations = []
  const maleFemaleRatios = []
  const birthRates = []

  for (const property in sourceStatistic) {
    if (property.includes('female_population_')) {
      const femalePopulationYear = property
        .split('male_population_')
        .pop() as string
      femalePopulations.push({
        [femalePopulationYear]: sourceStatistic[property]
      })
    } else if (property.includes('male_population_')) {
      const malePopulationYear = property
        .split('male_population_')
        .pop() as string
      malePopulations.push({
        [malePopulationYear]: sourceStatistic[property]
      })
    } else if (property.includes('population_')) {
      const totalPopulationYear = property.split('population_').pop() as string
      totalPopulations.push({
        [totalPopulationYear]: sourceStatistic[property]
      })
    } else if (property.includes('male_female_ratio_')) {
      const ratioYear = property.split('male_female_ratio_').pop() as string
      maleFemaleRatios.push({
        [ratioYear]: sourceStatistic[property]
      })
    } else if (property.includes('crude_birth_rate_')) {
      const birthRateYear = property.split('crude_birth_rate_').pop() as string
      birthRates.push({
        [birthRateYear]: sourceStatistic[property]
      })
    }
  }
  const identifiers: fhir.Identifier[] = [
    {
      system: 'http://opencrvs.org/specs/id/bbs-statistics-male-populations',
      value: JSON.stringify(malePopulations)
    },
    {
      system: 'http://opencrvs.org/specs/id/bbs-statistics-female-populations',
      value: JSON.stringify(femalePopulations)
    },
    {
      system: 'http://opencrvs.org/specs/id/bbs-statistics-total-populations',
      value: JSON.stringify(totalPopulations)
    },
    {
      system: 'http://opencrvs.org/specs/id/bbs-statistics-male-female-ratios',
      value: JSON.stringify(maleFemaleRatios)
    },
    {
      system: 'http://opencrvs.org/specs/id/bbs-statistics-crude-birth-rates',
      value: JSON.stringify(birthRates)
    }
  ]
  return identifiers
}

async function matchAndAssignStatisticalData(
  fhirLocations: fhir.BundleEntry[],
  statistics: IStatistic[]
) {
  const locationsWithStatistics: fhir.Location[] = []

  for (const locationEntry of fhirLocations) {
    const location = locationEntry.resource as fhir.Location
    const matchingStatistics = statistics.find((obj: IStatistic) => {
      return obj.reference === location.description
    })
    if (!matchingStatistics) {
      // tslint:disable-next-line:no-console
      console.log(
        `${chalk.red('Warning:')} No statistics can be found that matches: ${
          location.name
        }`
      )
    } else {
      const statisticalIdentifiers = generateStatisticalIdentifiers(
        matchingStatistics
      )
      if (!location.identifier) {
        throw Error('Location contains no identifiers')
      }
      location.identifier = [...location.identifier, ...statisticalIdentifiers]
      locationsWithStatistics.push(location)
    }
  }
  return locationsWithStatistics
}

export default async function addStatisticalData() {
  // tslint:disable-next-line:no-console
  console.log(
    `${chalk.blueBright(
      '/////////////////////////// UPDATING LOCATIONS WITH STATISTICAL DATA IN FHIR ///////////////////////////'
    )}`
  )

  let divisions
  try {
    divisions = await getFromFhir(`/Location/?identifier=DIVISION&_count=0`)
  } catch (err) {
    return internal(err)
  }

  let districts
  try {
    districts = await getFromFhir(`/Location/?identifier=DISTRICT&_count=0`)
  } catch (err) {
    return internal(err)
  }

  const statistics = {
    divisions: await matchAndAssignStatisticalData(
      divisions.entry,
      divisionsStatistics
    ),
    districts: await matchAndAssignStatisticalData(
      districts.entry,
      districtsStatistics
    )
  }

  fs.writeFileSync(
    `${ADMIN_STRUCTURE_SOURCE}statistics/divisions-statistics.json`,
    JSON.stringify({ divisions: statistics.divisions }, null, 2)
  )

  fs.writeFileSync(
    `${ADMIN_STRUCTURE_SOURCE}statistics/districts-statistics.json`,
    JSON.stringify({ districts: statistics.districts }, null, 2)
  )

  return true
}

addStatisticalData()