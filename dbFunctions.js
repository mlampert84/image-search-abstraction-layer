const mongodb = require('mongodb')

async function connectToDB  (uri,dbName,collectionName){

  let client
  try{
  client = await mongodb.MongoClient.connect(uri)
  console.log("In the database.")
  let db = client.db(dbName)
  let collection = db.collection(collectionName)

  return {client: client,
          collection: collection}

  }catch(err){console.log(err)}

}

async function disconnectFromDB(client){
  try{
  await client.close()
  
  }catch(err){console.log(err)}


 }

async function insertIntoDB(entry,collection){
collection.insert(entry)
}

exports.connectToDB = connectToDB
exports.disconnectFromDB = disconnectFromDB
exports.insertIntoDB = insertIntoDB
