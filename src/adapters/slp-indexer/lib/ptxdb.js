/*
  This library contains utility functions for cleaning up the processed tx db.
*/

let _this

class ManagePTXDB {
  constructor (localConfig = {}) {
    this.pTxDb = localConfig.pTxDb
    if (!this.pTxDb) {
      throw new Error(
        'Must pass instance of pTxDb when instantiating ManagePTXDB lib'
      )
    }

    // State
    this.keys = []
    this.cleanCnt = 0

    _this = this
  }

  // Return a promise, which resolves to true when all txs have been collected
  // from the database and stored in this.keys array.
  getAllTxs () {
    return new Promise((resolve) => {
      const stream = this.pTxDb.createReadStream()

      stream.on('data', function (data) {
        // console.log(data.key, ' = ', data.value)
        _this.keys.push(data.key)
      })

      stream.on('end', function () {
        return resolve(true)
      })
    })
  }

  // Remove entries in the DB that are old and not needed.
  async cleanPTXDB (blockHeight) {
    try {
      // Get all TXs in the database.
      await this.getAllTxs()

      const cutoff = blockHeight - 10

      // Loop through each TX in the database.
      for (let i = 0; i < this.keys.length; i++) {
        const thisKey = this.keys[i]
        const value = await this.pTxDb.get(thisKey)

        // If the value is older than the cutoff, delete the db entry.
        if (value <= cutoff) {
          try {
            await this.pTxDb.del(thisKey)
            this.cleanCnt++
          } catch (err) {
            console.log(`Could not delete ${thisKey} from the pTxDB`)
          }
        }

        // Temp code. Delete this after 12/12/21
        // if (value === true) {
        //   await this.pTxDb.del(thisKey)
        //   this.cleanCnt++
        // }
      }

      console.log(`Cleaned ${this.cleanCnt} entries from the pTxDb.`)

      return true
    } catch (err) {
      console.error('Error in cleanPTXDB()')
      throw err
    }
  }
}

module.exports = ManagePTXDB
