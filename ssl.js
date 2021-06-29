
const fs = require('fs')
const path = require('path')
const forge = require('node-forge')
const {execFile,exec,execFileSync,execSync} = require('child_process');
var dateFormat = require("dateformat");
const { restart } = require('nodemon');
const { domain } = require('process');



const configfile = fs.readFileSync('config.txt')
var configjson = JSON.parse(configfile)


var config = configjson.config;

console.log(config)


var domains = configjson.domains
//console.log(domains)



if (!fs.existsSync(config.pempath)){
    fs.mkdirSync(config.pempath);
}

const pembackupdir = path.join(config.pempath,"backup")
if (!fs.existsSync(pembackupdir)){
    fs.mkdirSync(pembackupdir);
}

const vhostbackupdir = path.join(config.vhostpath,"backup")
if (!fs.existsSync(vhostbackupdir)){
    fs.mkdirSync(vhostbackupdir);
}

const tempdirforauth = path.join(config.basewww,"tempforauth")
if (!fs.existsSync(tempdirforauth)){
    fs.mkdirSync(tempdirforauth);
}





var isNewDomainExist = false;

var domainToBeRenewed = [];

domains.forEach((data)=>{

    var domain = data.name


    var files = fs.readdirSync(config.pempath).filter(fn=>fn.startsWith(domain))

    if (files.length > 1){

        // key and cert exist

        if (checkExistCertExpire(data)){

            domainToBeRenewed.push(data);

            files.forEach(file=>{

                var newfilename = `bk_${Math.ceil(Date.now()/1000)}_${file}`

                fs.copyFileSync(path.join(config.pempath,file),path.join(pembackupdir,newfilename))

            })

        }

    }
    else{
        isNewDomainExist = true;
        domainToBeRenewed.push(data)


    }

})

console.log('\x1b[33m%s\x1b[0m',"domains to be renewed")
console.log(domainToBeRenewed)



//restartapache();

if ( domainToBeRenewed.length > 0){

    console.log("need renew cert");

    // vhost to make all domain to an temp directory
    // to avoid any exsiting .htacess or redirect logic 

    generateTempVhostFileforauth();

    restartapache();

}


// get new key 

domainToBeRenewed.forEach(data=>{

    console.log(data.name)

    var hostname = data.name

    if (data.name.split(".").length == 2){

        hostname = `${data.name},www.${data.name}`
    }


    var rootdir = path.join(config.basewww,data.rootdir)
    var getCert = `${config.acmepath} --target manual --host ${hostname} --validation filesystem --webroot "${tempdirforauth}" --store pemfiles --pemfilespath ${config.pempath}`


    console.log(getCert);

    console.log(execSync(getCert).toString())


})


// generate new html-vhost and html-ssl file 
generateNewVhostFile();


generateNewSSLHostFile();


restartapache();





/////////////////////////


function restartapache(){

    console.log("restart apache");
    console.log(execSync(config.apacherestart).toString())

}

function generateTempVhostFileforauth(){


    // clear all content of ssl file

    var empty = ''

    fs.writeFileSync(path.join(config.vhostpath,config.sslfile),empty)


    var newfilename = `bk_${Math.ceil(Date.now()/1000)}_${config.vhostfile}`

    fs.copyFileSync(path.join(config.vhostpath,config.vhostfile),path.join(vhostbackupdir,newfilename))

    var text = '';

    configjson.domains.forEach(domain=>{


        console.log(domain)

        var serveralias = domain.name

        if (domain.name.split('.').length == 2){

            // top level domain 

            serveralias = `${domain.name} www.${domain.name}`
        }

        var datestr = dateFormat(new Date(),("yy-mmmm-dd"))

var vhoststr =`<VirtualHost *:80>

DocumentRoot "${tempdirforauth}"
ServerName ${domain.name}
ServerAlias ${serveralias}
     ErrorLog "logs/${domain.name}-error-${datestr}.log"
CustomLog "logs/${domain.name}-access-${datestr}.log" common env=!dontlog

<Directory ${tempdirforauth}>
    Options -Indexes +Includes +FollowSymLinks +MultiViews
    AllowOverride All
    Require all granted
</Directory>	

</VirtualHost>\n\n`


//



        text += vhoststr


    })


    //console.log(text);

    fs.writeFileSync(path.join(config.vhostpath,config.vhostfile),text)



}


function generateNewVhostFile(){

    // var newfilename = `bk_${Math.ceil(Date.now()/1000)}_${config.vhostfile}`

    // fs.copyFileSync(path.join(config.vhostpath,config.vhostfile),path.join(vhostbackupdir,newfilename))


    var text = '';

    configjson.domains.forEach(domain=>{


        console.log(domain)

        var serveralias = domain.name

        if (domain.name.split('.').length == 2){

            // top level domain 

            serveralias = `${domain.name} www.${domain.name}`
        }

        var datestr = dateFormat(new Date(),("yy-mmmm-dd"))

var vhoststr =`<VirtualHost *:80>

DocumentRoot "${path.join(config.basewww,domain.rootdir)}"
ServerName ${domain.name}
ServerAlias ${serveralias}
     ErrorLog "logs/${domain.name}-error-${datestr}.log"
CustomLog "logs/${domain.name}-access-${datestr}.log" common env=!dontlog

<Directory ${path.join(config.basewww,domain.rootdir)}>
    Options -Indexes +Includes +FollowSymLinks +MultiViews
    AllowOverride All
    Require all granted
</Directory>	

</VirtualHost>\n\n`


//



        text += vhoststr


    })


    //console.log(text);

    fs.writeFileSync(path.join(config.vhostpath,config.vhostfile),text)


}

function generateNewSSLHostFile(){

    var newfilename = `bk_${Math.ceil(Date.now()/1000)}_${config.sslfile}`

    fs.copyFileSync(path.join(config.vhostpath,config.sslfile),path.join(vhostbackupdir,newfilename))


    var text = `Listen 443\n\n
    SSLCipherSuite HIGH:MEDIUM:!MD5:!RC4:!3DES
    SSLProxyCipherSuite HIGH:MEDIUM:!MD5:!RC4:!3DES
    SSLHonorCipherOrder on 
    SSLProtocol all -SSLv3
SSLProxyProtocol all -SSLv3
SSLPassPhraseDialog  builtin\n\n
    `;

    configjson.domains.forEach(domain=>{


        console.log(domain)

        var serveralias = domain.name

        if (domain.name.split('.').length == 2){

            // top level domain 

            serveralias = `${domain.name} www.${domain.name}`
        }

        var datestr = dateFormat(new Date(),("yy-mmmm-dd"))

var vhoststr =`

<VirtualHost *:443>  

DocumentRoot "${path.join(config.basewww,domain.rootdir)}"
ServerName ${domain.name}
ServerAlias ${serveralias}
     ErrorLog "logs/${domain.name}-error-${datestr}.log"
CustomLog "logs/${domain.name}-access-${datestr}.log" common env=!dontlog
SSLEngine on  

SSLProtocol -all +TLSv1 +TLSv1.1 +TLSv1.2 

SSLCipherSuite ALL:!ADH:!EXPORT56:RC4+RSA:+HIGH:+MEDIUM:+LOW:+SSLv2:+EXP:+eNULL  



    SSLCertificateFile ${path.join(config.pempath,domain.name)}-crt.pem
    SSLCertificateKeyFile ${path.join(config.pempath,domain.name)}-key.pem
    SSLCertificateChainFile ${path.join(config.pempath,domain.name)}-chain.pem
        <Directory ${path.join(config.basewww,domain.rootdir)}>
            Options -Indexes +Includes +FollowSymLinks +MultiViews
            AllowOverride All
            Require all granted
    </Directory>	
	
</VirtualHost>\n\n`


//



        text += vhoststr


    })


    //console.log(text);

    fs.writeFileSync(path.join(config.vhostpath,config.sslfile),text)

}




function checkExistCertExpire(data){

    var domain = data.name
    console.log(domain)

    var certname = `${domain}-crt.pem`


    var buffer = fs.readFileSync(path.join(config.pempath,certname))


    const cert = forge.pki.certificateFromPem(buffer)

    const expiry = new Date(cert.validity.notAfter)

    const today = new Date()

    const dateToExpire = Math.ceil((expiry - today)/86400/1000)


    if (dateToExpire >20 ){

        console.log(`${domain} ${dateToExpire}days, it's too far to renw cert`)

        return false;
    }
    else{



        return true;

    }

    

}


