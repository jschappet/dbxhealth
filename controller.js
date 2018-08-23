var fetch = require('isomorphic-fetch');

const 
redirectUri = `https://health.schappet.com/oauthredirect`,
crypto = require('crypto'),
config = require('./config'),
NodeCache = require( "node-cache" ),
Dropbox = require('dropbox').Dropbox,
dbxconfig = {
  fetch: fetch,
  clientId: config.DBX_APP_KEY,
  clientSecret: config.DBX_APP_SECRET
}
;
var mycache = new NodeCache();
var dbx = new Dropbox(dbxconfig);


//add to the variable definition section on the top
rp = require('request-promise');

//steps 8-12
module.exports.oauthredirect = async (req,res,next)=>{

  if(req.query.error_description){
    return next( new Error(req.query.error_description));
  } 

  let state= req.query.state;
  if(!mycache.get(state)){
    return next(new Error("session expired or invalid state"));
  } 

  //Exchange code for token
  if(req.query.code ){
	
 let code = req.query.code;
  console.log(code);
  var options = Object.assign({
    code,
    redirectUri
  }, config);


 dbx.getAccessTokenFromCode(redirectUri, code)
    .then( async function(token) {
        //console.log(token);
        //mycache.set("aTempTokenKey", token, 3600);
	//await regenerateSessionAsync(req);
	req.session.token = token;
	res.redirect('/');
    })
    .catch(function(error) {
        console.log(error);
        return next(new Error('error getting token. '+error.message));
    });
  
  }
}

//steps 1,2,3
module.exports.home = async (req,res,next)=>{    
  //let token = mycache.get("aTempTokenKey");
  let token = req.session.token;
  if (token) {
    let path = "/" + req.params.year + "/"  + req.params.month ;
    res.render('index' , { title: "Fast Track to Health" } );
  } else {
    res.redirect('/login');  
  }
} 



module.exports.display = async (req,res,next)=>{
  //let token = mycache.get("aTempTokenKey");
  let token = req.session.token;
  let path = "/" + req.params.year + "/"  + req.params.month ;
  if (req.params.year === undefined) {
    res.render('index' , { title: "Fast Track to Health" } );
  } else {
  if(token){
    try{
      //getLinks(token, path);
      let paths = await getLinksAsync(token, req.params.year, req.params.month);
      res.render('display', { imgs: paths, layout:false});
    }catch(error){
        console.log(error);
      return next(new Error("Error getting images from Dropbox"));
    }
  }else{
    res.redirect('/login');
  }
}
}

//steps 4,5,6
module.exports.login = (req,res,next)=>{
    
    //create a random state value
    let state = crypto.randomBytes(16).toString('hex');
     
    mycache.set(state, req.sessionID, 1800);

    //Save state and temporarysession for 10 mins
   // mycache.set(state, "aTempSessionValue", 1800);
     
    let dbxRedirect= config.DBX_OAUTH_DOMAIN 
            + config.DBX_OAUTH_PATH 
            + "?response_type=code&client_id="+config.DBX_APP_KEY
            + "&redirect_uri="+config.OAUTH_REDIRECT_URL 
            + "&state="+state;
    
    res.redirect(dbxRedirect);
}



/*Gets temporary links for a set of files in the root folder of the app
It is a two step process:
1.  Get a list of all the paths of files in the folder
2.  Fetch a temporary link for each file in the folder */
async function getLinksAsync(token, year, month){

  //List images from the root of the app folder
  let result= await listImagePathsAsync(token, '/' + year + '/' + month);

  //Get a temporary link for each of those paths returned
  let temporaryLinkResults= await getTemporaryLinksForPathsAsync(token,result.paths);

  //Construct a new array only with the link field
  var temporaryLinks = temporaryLinkResults.map(function (entry) {
    return { path_lower: entry.metadata.path_lower , link: entry.link , name: entry.metadata.name.replace("\.json","") } ;
  });

  return temporaryLinks;
}


async function getLinks(token, path) {
  var dbx = new Dropbox({ accessToken: token });
  dbx.filesListFolder({ path: path })
    .then(function (response) {
      console.log(response);
    })
    .catch(function (err) {
      console.log(err);
    });

}


/*
Returns an object containing an array with the path_lower of each 
image file and if more files a cursor to continue */
async function listImagePathsAsync(token,path){

  let options={
    url: config.DBX_API_DOMAIN + config.DBX_LIST_FOLDER_PATH, 
    headers:{"Authorization":"Bearer "+token},
    method: 'POST',
    json: true ,
    body: {"path":path}
  }

  try{
    //Make request to Dropbox to get list of files
    let result = await rp(options);

    //Filter response to images only
    let entriesFiltered= result.entries.filter(function(entry){
	return entry.path_lower.search(/\.json$/i) > -1;
      //return entry.path_lower.search(/\.(gif|jpg|jpeg|tiff|png|json)$/i) > -1;
    });        

    //Get an array from the entries with only the path_lower fields
    var paths = entriesFiltered.map(function (entry) {
	//console.log(entry);
      return entry.path_lower;
    });

    //return a cursor only if there are more files in the current folder
    let response= {};
    response.paths= paths;
    if(result.hasmore) response.cursor= result.cursor;        
    return response;

  }catch(error){
    return next(new Error('error listing folder. '+error.message));
  }        
} 


//Returns an array with temporary links from an array with file paths
function getTemporaryLinksForPathsAsync(token,paths){

  var promises = [];
  let options={
    url: config.DBX_API_DOMAIN + config.DBX_GET_TEMPORARY_LINK_PATH, 
    headers:{"Authorization":"Bearer "+token},
    method: 'POST',
    json: true
  }

  //Create a promise for each path and push it to an array of promises
  paths.forEach((path_lower)=>{
    options.body = {"path":path_lower};
    promises.push(rp(options));
  });

  //returns a promise that fullfills once all the promises in the array complete or one fails
  return Promise.all(promises);
}


//Returns a promise that fulfills when a new session is created
async function regenerateSessionAsync(req){
  return new Promise((resolve,reject)=>{
    req.session.regenerate((err)=>{
      err ? reject(err) : resolve();
    });
  });
}
