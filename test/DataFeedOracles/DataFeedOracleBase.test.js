import { expectEvent, shouldFail } from 'openzeppelin-test-helpers'
const { soliditySha3, toAscii, fromAscii, padRight, BN } = web3.utils

const DataFeedOracleBase = artifacts.require('DataFeedOracleBase')

require('chai').should()

const now = Math.round((new Date()).getTime() / 1000)

const ORACLE_INDEX_0 = 0
const ORACLE_INDEX_1 = 1
const ORACLE_INDEX_5 = 5
const ORACLE_INDEX_7 = 7
const ORACLE_INDEX_1_DATE = now - 4 * 60 * 60 | 0
const ORACLE_INDEX_2_DATE = now - 3 * 60 * 60 | 0
const ORACLE_INDEX_3_DATE = now - 2 * 60 * 60 | 0
const ORACLE_INDEX_4_DATE = now - 1 * 60 * 60 | 0
const ORACLE_INDEX_5_DATE = now | 0
const HALF_AN_HOUR_AGO = now - 0.5 * 60 * 60 | 0
const HALF_AN_HOUR_LATER = now + 0.5 * 60 * 60 | 0
const ORACLE_INDEX_1_RESULT = soliditySha3('4 hours ago')
const ORACLE_INDEX_2_RESULT = soliditySha3('3 hours ago')
const ORACLE_INDEX_3_RESULT = soliditySha3('2 hours ago')
const ORACLE_INDEX_4_RESULT = soliditySha3('1 hour ago')
const ORACLE_INDEX_5_RESULT = soliditySha3('now')
const HALF_AN_HOUR_LATER_RESULT = soliditySha3('0.5 hours later')

const RESULTS_DATA = new Map([
  [ORACLE_INDEX_1_DATE, ORACLE_INDEX_1_RESULT],
  [ORACLE_INDEX_2_DATE, ORACLE_INDEX_2_RESULT],
  [ORACLE_INDEX_3_DATE, ORACLE_INDEX_3_RESULT],
  [ORACLE_INDEX_4_DATE, ORACLE_INDEX_4_RESULT],
  [ORACLE_INDEX_5_DATE, ORACLE_INDEX_5_RESULT] // index 5
])

contract('DataFeedOracleBase', (accounts) => {
  const dataSource = accounts[1]

  let oracle
  beforeEach(async ()=> {
    oracle = await DataFeedOracleBase.new()
  })

  it('cannot be initialized with data source as the zero address', async () => {
    await shouldFail(oracle.initialize(0))
  })

  it('is initialized with the correct state', async () => {
    await oracle.initialize(dataSource)

    await shouldFail(oracle.resultByIndex(ORACLE_INDEX_1))
    await shouldFail(oracle.resultByIndex(ORACLE_INDEX_0))
    await shouldFail(oracle.resultByDate(now))

    const dateHasResult = await oracle.dateHasResult(now)
    dateHasResult.should.equal(false)

    const indexHasResult = await oracle.indexHasResult(ORACLE_INDEX_1)
    indexHasResult.should.equal(false)
  })

  it('can set result by data source', async () => {
    await oracle.initialize(dataSource)

    for(var [key, value] of RESULTS_DATA) {
      await oracle.setResult(value, key, { from: dataSource });
    }

    const isResultSet = await oracle.dateHasResult(ORACLE_INDEX_5_DATE)
    isResultSet.should.equal(true)
    const indexHasResult = await oracle.indexHasResult(ORACLE_INDEX_5)
    indexHasResult.should.equal(true)

    const [resultByIndex, date] = Object.values(await oracle.resultByIndex(ORACLE_INDEX_5))
    resultByIndex.should.equal(ORACLE_INDEX_5_RESULT)
    date.should.eq.BN(ORACLE_INDEX_5_DATE)
    const [resultByDate, index] = Object.values(await oracle.resultByDate(ORACLE_INDEX_5_DATE))
    resultByDate.should.equal(ORACLE_INDEX_5_RESULT)
    index.should.eq.BN(ORACLE_INDEX_5)

    const latestResultDate = await oracle.latestResultDate()
    latestResultDate.should.eq.BN(ORACLE_INDEX_5_DATE)

    const latestResult = await oracle.latestResult()
    latestResult.should.equal(ORACLE_INDEX_5_RESULT)
  })

  it('cannot be set by a different data source', async () => {
    await oracle.initialize(dataSource)

    await shouldFail(oracle.setResult(ORACLE_INDEX_5_RESULT, ORACLE_INDEX_5_DATE, { from: accounts[2] }))

    const isResultSet = await oracle.dateHasResult(ORACLE_INDEX_5_DATE)
    isResultSet.should.equal(false)
    const indexHasResult = await oracle.indexHasResult(ORACLE_INDEX_1)
    indexHasResult.should.equal(false)

    await shouldFail(oracle.resultByIndex(ORACLE_INDEX_1))
    await shouldFail(oracle.resultByDate(ORACLE_INDEX_5_DATE))
  })

  it('cannot be set twice', async () => {
    await oracle.initialize(dataSource)
    await oracle.setResult(ORACLE_INDEX_5_RESULT, ORACLE_INDEX_5_DATE, { from: dataSource })
    await shouldFail(oracle.setResult(ORACLE_INDEX_5_RESULT, ORACLE_INDEX_5_DATE, { from: dataSource }))
  })

  it('cannot set date earlier than last added data feed', async () => {
    await oracle.initialize(dataSource)
    await oracle.setResult(ORACLE_INDEX_5_RESULT, ORACLE_INDEX_5_DATE, { from: dataSource })
    await shouldFail(oracle.setResult(ORACLE_INDEX_4_RESULT, ORACLE_INDEX_4_DATE, { from: dataSource }))
  })

  it('cannot set a date later than the `now` value', async () => {
    await oracle.initialize(dataSource)
    await shouldFail(
      oracle.setResult(HALF_AN_HOUR_LATER_RESULT, HALF_AN_HOUR_LATER, { from: dataSource })
    )
  })

  it('cannot fetch result with invalid index or date', async () => {
    await oracle.initialize(dataSource)
    for( var [key, value] of RESULTS_DATA ){
      await oracle.setResult(value, key, { from: dataSource });
    }
    const indexHasResult = await oracle.indexHasResult(ORACLE_INDEX_7)
    indexHasResult.should.equal(false)
    await shouldFail(oracle.resultByIndex(ORACLE_INDEX_7))

    let isResultSet = await oracle.dateHasResult(HALF_AN_HOUR_AGO)
    isResultSet.should.equal(false)
    await shouldFail(oracle.resultByDate(HALF_AN_HOUR_AGO))

    isResultSet = await oracle.dateHasResult(HALF_AN_HOUR_LATER)
    isResultSet.should.equal(false)
    await shouldFail(oracle.resultByDate(HALF_AN_HOUR_LATER))
  })

  it('should emit ResultSet event', async () => {
    await oracle.initialize(dataSource)
    const { logs } = await oracle.setResult(ORACLE_INDEX_1_RESULT, ORACLE_INDEX_1_DATE, { from: dataSource})
    const dateResult = new BN(ORACLE_INDEX_1_DATE)
    const indexResult = new BN(ORACLE_INDEX_1)
    await expectEvent.inLogs(
      logs,
      'ResultSet',
      { _result: ORACLE_INDEX_1_RESULT,
        _date: dateResult,
        _index: indexResult,
        _sender: dataSource
      }
    )
  })
})
