const https = require('https')
const http = require('http')
const url = require('url')
const path = require('path')
const dotenv = require('dotenv').config()
const practiceGetUrl = 'http://httpbin.org/get?key=' + process.env.PRACTICE_SECRET_VARIABLE
const dbFunctions = require('./dbFunctions.js')
const fs = require('fs')
let uri = process.env.MONGOLAB_URI_LOCAL || process.env.MONGO_LAB_URI_HEROKU
let googleCX = process.env.SEARCHENGINE_ID
function getRequest(url){
  return new Promise((resolve,reject)=>{
    https.get(url,apiRes=>{
      apiRes.setEncoding("utf8")
      let body = ""
      apiRes.on("data",data=>{body += data})
      apiRes.on("end",()=> resolve(body))
  }).on('error',(e) => reject(e))
})
}

function formatGoogleApiRes(jsonRes){
  
  if(jsonRes.error)
    return jsonRes

  let  imageSearchResults = new Array()
  jsonRes.items.forEach((element)=>{
        imageSearchResults.push(
            {url: element.link,
              snippet: element.snippet,
              thumbnail: element.image.thumbnailLink,
              context: element.image.contextLink
           })
      })
  return imageSearchResults
}


http.createServer(async function (req,res){

res.writeHead(200,{'Content-Type': 'text/html'})

let fullApiCall = url.parse(req.url,1)
let pathedApiCall = path.parse(fullApiCall.pathname)

if(req.url === '/'){
 fs.readFile(__dirname + '/public/index.html',(err,contents)=>{
  if(err)
   console.log(err)
  else
   res.end(contents)
 })

  
//  res.write('<pre>hello world! This is the landing page</pre>')
// res.end()
}
else if(pathedApiCall.dir === '/api/imagesearch'){
  let searchRecord = {term: pathedApiCall.base,
                      when: (new Date()).toString()
                 }
  try{
  let dbInfo = await dbFunctions.connectToDB(uri,"google_image_search","recent_searches")
  dbInfo.collection.insert(searchRecord)
  await dbFunctions.disconnectFromDB(dbInfo.client)
  }catch(err){
    res.write(JSON.stringify({Error: "Failed to log search in databased, with following error: " + err.message}))
    res.end()
    }

  let searchReqTerms = {key: process.env.GOOGLE_SEARCH_API_KEY,
                        cx: googleCX
                        searchType: 'image',
                        q: pathedApiCall.base,
                        num: 10,
                        start: fullApiCall.query.offset
  }
  googleApiCall = "https://www.googleapis.com/customsearch/v1?"

  for(var prop in searchReqTerms){
    if(typeof searchReqTerms[prop] !== 'undefined')
      googleApiCall += (prop + "=" + searchReqTerms[prop] + "&")
  }
  let googleApiRes
  try{
    googleApiRes = await getRequest(googleApiCall)
 
    let output = formatGoogleApiRes(JSON.parse(googleApiRes))
    res.writeHeader(200,{'Content-Type':'application/json'} )
    res.end(JSON.stringify(output,null,3))
  }catch(error){    
//    console.log(error)
    res.write(JSON.stringify({Error:"Get request to client  or its formatting returned the following  error: "+ error.message}))
    res.end()
  }

}
else if((pathedApiCall.dir === '/api/latest') && (pathedApiCall.base === 'imagesearch')){
  try{
  let dbInfo = await dbFunctions.connectToDB(uri,"google_image_search","recent_searches")
  let searchResults = await  dbInfo.collection.find().sort({$natural:-1}).limit(5).toArray()
 await dbFunctions.disconnectFromDB(dbInfo.client) 
  
 //I'm not sure why, but when Content-Type is set to "applicaiton/json" my browser downloads a file rather than printing.
 //This is puzzling because with I set that Content-Type in my google search results, it prints to the screen.
 //I can't figure out why the behavoir is different.
 res.writeHeader(200,{'Content-Type':'text/plain'})
  res.end(JSON.stringify(searchResults,['term','when'],3))
  }catch(error){
//  console.log(error)
  res.write(JSON.stringify({Error: "Trouble with database calls: " + error.message}))
  res.end()
  }
  }
else{
 res.writeHead(404,{'Content-Type':'text/plain'})
 res.write('Cannot GET '+ req.url)
 res.end()
}
}).on('error',(e)=>console.log("Get Request could not be completed."))
.listen(process.env.PORT || 3000)
